import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { usePreferencesStore, defaultPreferences } from '../stores/preferencesStore';
import { setPreferences as persistPreferences, renderTypst, debugPaths } from '../api';
import type { Preferences } from '../types';
import { themePresets } from '../themes'; // Import themes
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';
import './DesignModal.css';
import {
  ThemesTab,
  DocumentTab,
  TypographyTab,
  SpacingTab,
  StructureTab,
  ImagesTab,
  PresetsTab,
  type TabSection
} from './DesignModal/index';

// Create scoped logger
const designLogger = logger.createScoped('DesignModal');

const DESIGN_TABS: { id: TabSection; label: string; icon: string }[] = [
  { id: 'themes', label: 'Themes', icon: '🎨' },
  { id: 'document', label: 'Document', icon: '📄' },
  { id: 'typography', label: 'Typography', icon: '🔤' },
  { id: 'spacing', label: 'Spacing & Layout', icon: '📐' },
  { id: 'structure', label: 'Structure', icon: '🧱' },
  { id: 'images', label: 'Images', icon: '🖼️' },
  { id: 'presets', label: 'Presets', icon: '💾' },
];

const DesignModal: React.FC = () => {
  const { preferences, setPreferences, themeSelection, setThemeSelection, customPresets, saveCustomPreset, deleteCustomPreset, renameCustomPreset, autoApply, setAutoApply } = usePreferencesStore();
  const { designModalOpen, setDesignModalOpen, designModalActiveTab, setDesignModalActiveTab, addToast } = useUIStore();
  const currentFile = useEditorStore(s => s.editor.currentFile);
  const setCompileStatus = useEditorStore(s => s.setCompileStatus);
  const [local, setLocal] = useState<Preferences>(preferences);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabSection>('document');
  const [showPresetNameModal, setShowPresetNameModal] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const originalRef = useRef<Preferences | null>(null);
  const applyTimer = useRef<number | null>(null);
  const applySeq = useRef(0);

  const handleBrowseCoverImage = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'] }]
      });
      const filePath = Array.isArray(result) ? result?.[0] : result;
      if (filePath) {
        // Delete old cover image if it exists
        if (local.cover_image) {
          try {
            const { deleteFile } = await import('../api');
            await deleteFile(local.cover_image);
          } catch (err) {
            designLogger.warn('Failed to delete old cover image', err);
          }
        }

        // Import the image to assets directory and get relative path
        const { importImageFromPath } = await import('../api');
        const relativePath = await importImageFromPath(filePath);
        mutate({ cover_image: relativePath });
      }
    } catch (err) {
      designLogger.warn('Failed to browse for image', err);
    }
  };

  // Snapshot ONLY when the modal just opened (not on every preferences mutation)
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (designModalOpen && !prevOpenRef.current) {
      setLocal(preferences);
      originalRef.current = preferences; // snapshot for cancel
      setDirty(false);

      // If a specific tab was requested, switch to it
      if (designModalActiveTab) {
        setActiveTab(designModalActiveTab);
        setDesignModalActiveTab(null); // Clear the forced tab state
      }
    }
    prevOpenRef.current = designModalOpen;
  }, [designModalOpen, preferences, designModalActiveTab, setDesignModalActiveTab]);

  useEffect(() => {
    if (!designModalOpen) return;

    const handleTabHotkey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;

      const index = parseInt(event.key, 10);
      if (!Number.isInteger(index)) return;

      const tab = DESIGN_TABS[index - 1];
      if (!tab) return;

      event.preventDefault();
      setActiveTab(tab.id);
    };

    window.addEventListener('keydown', handleTabHotkey);
    return () => {
      window.removeEventListener('keydown', handleTabHotkey);
    };
  }, [designModalOpen]);

  const latestSeq = () => applySeq.current;

  // Unified re-render that supports the in-memory sample document (which has no on-disk path)
  const rerenderCurrent = async () => {
    const { editor: { currentFile, content } } = useEditorStore.getState();
    if (!currentFile) return;
    // Always use renderTypst for live preview with current file context
    await renderTypst(content, 'pdf', currentFile);
  };

  const scheduleApply = (next: Preferences) => {
    if (!autoApply) return; // manual mode; only local state updates
    if (applyTimer.current) window.clearTimeout(applyTimer.current);
    const seq = ++applySeq.current;
    designLogger.debug('schedule', { seq, toc: next.toc, cover: next.cover_page });
    applyTimer.current = window.setTimeout(async () => {
      try {
        if (seq !== latestSeq()) {
          designLogger.debug('apply-skip-stale', { seq, current: latestSeq() });
          return;
        }
        designLogger.debug('apply-fire', { seq, toc: next.toc, cover: next.cover_page });
        setCompileStatus({ status: 'running' });
        setPreferences(next);            // update in-memory store
        await persistPreferences(next);  // persist to backend _prefs.json
        debugPaths().then(info => designLogger.debug('auto', info)).catch(()=>{});
        await rerenderCurrent();
      } catch (e) {
        designLogger.warn('auto apply failed', e);
        handleError(e, { operation: 'apply preferences', component: 'DesignModal' }, 'warning');
      }
    }, next.render_debounce_ms || 400);
  };

  const mutate = (patch: Partial<Preferences>) => {
    const next: Preferences = { ...local, ...patch } as Preferences;
    designLogger.debug('mutate', { from: { toc: local.toc, cover: local.cover_page }, to: { toc: next.toc, cover: next.cover_page } });
    setLocal(next);
    setDirty(true);
    if (themeSelection !== 'custom') setThemeSelection('custom');
    // Only cover_page triggers immediate apply; TOC is now debounced
    if (Object.prototype.hasOwnProperty.call(patch, 'cover_page')) {
      if (applyTimer.current) {
        window.clearTimeout(applyTimer.current);
        applyTimer.current = null;
      }
      const seq = ++applySeq.current;
      designLogger.debug('immediate-structure-apply', { seq, toc: next.toc, cover: next.cover_page });
      (async () => {
        try {
          setCompileStatus({ status: 'running' });
          setPreferences(next);
          await persistPreferences(next);
          debugPaths().then(info => designLogger.debug('immediate-structure-meta', info)).catch(()=>{});
          await rerenderCurrent();
        } catch (e) {
          designLogger.warn('immediate structure apply failed', e);
          handleError(e, { operation: 'apply cover page changes', component: 'DesignModal' }, 'warning');
        }
      })();
    } else {
      scheduleApply(next);
    }
  };

  const handlePresetSelect = (id: string) => {
    // Prevent manually selecting "custom" - it should only be set automatically
    if (id === 'custom') {
      return;
    }

    setThemeSelection(id);

    // Check if it's a custom preset
    const customPreset = customPresets[id];
    if (customPreset) {
      const merged: Preferences = {
        ...customPreset.preferences,
        margin: { ...customPreset.preferences.margin },
        fonts: { ...customPreset.preferences.fonts },
      };
      setLocal(merged);
      setPreferences(merged);
      scheduleApply(merged);
      return;
    }

    // Otherwise it's a built-in theme
    const preset = themePresets[id];
    if (preset) {
      const merged: Preferences = {
        ...preset.preferences,
        margin: { ...preset.preferences.margin },
        fonts: { ...preset.preferences.fonts },
        two_column_layout: id === 'academic', // Enable two-column for academic theme
      };
      setLocal(merged);
      setPreferences(merged); // Directly update preferences
      scheduleApply(merged);
    }
  };

  const handleSave = async () => {
    try {
      setCompileStatus({ status: 'running' });
      setPreferences(local);             // update store
      await persistPreferences(local);    // API handles backend field mapping
      debugPaths().then(info => designLogger.debug('save', info)).catch(()=>{});
      await rerenderCurrent();
      originalRef.current = local;
      setDirty(false);
      setDesignModalOpen(false);
    } catch (e) {
      designLogger.warn('save failed', e);
      handleError(e, { operation: 'save preferences', component: 'DesignModal' });
    }
  };

  const handleCancel = () => {
    if (originalRef.current) {
      setPreferences(originalRef.current);
      setLocal(originalRef.current);
    }
    setDirty(false);
    setDesignModalOpen(false);
  };

  const handleReset = async () => {
    const base: Preferences = {
      ...defaultPreferences,
      margin: { ...defaultPreferences.margin },
      fonts: { ...defaultPreferences.fonts },
    };
    setLocal(base);
    setDirty(true);
    setThemeSelection('default'); // Reset theme to default

    // Apply default theme preferences
    const defaultTheme = themePresets['default'];
    if (defaultTheme) {
      const merged: Preferences = {
        ...defaultTheme.preferences,
        margin: { ...defaultTheme.preferences.margin },
        fonts: { ...defaultTheme.preferences.fonts },
      };
      setLocal(merged);

      if (autoApply) {
        try {
          setCompileStatus({ status: 'running' });
          setPreferences(merged);
          await persistPreferences(merged);
          debugPaths().then(info => designLogger.debug('reset', info)).catch(()=>{});
          await rerenderCurrent();
          setDirty(false);
        } catch (e) {
          designLogger.warn('reset apply failed', e);
        }
      }
    }
  };


  if (!designModalOpen) return null;


  return (
    <div className="design-modal-overlay" onClick={() => setDesignModalOpen(false)}>
      <div className="design-modal design-modal-tabbed" onClick={e => e.stopPropagation()}>
        <div className="design-modal-header">
          <h2>Design & Layout</h2>
          <div className="theme-select-row">
            <label>
              Theme
              <select value={themeSelection} onChange={(e) => handlePresetSelect(e.target.value)}>
                {Object.entries(themePresets).map(([id, theme]) => (
                  <option key={id} value={id} title={theme.description}>{theme.name}</option>
                ))}
                {Object.keys(customPresets).length > 0 && <option disabled>──────────</option>}
                {Object.entries(customPresets).map(([id, preset]) => (
                  <option key={id} value={id}>{preset.name} ⭐</option>
                ))}
                {themeSelection === 'custom' && <option value="custom">Custom</option>}
              </select>
            </label>
            <button
              type="button"
              className="save-preset-quick-btn"
              onClick={() => {
                if (themeSelection !== 'custom') {
                  return;
                }
                setPresetNameInput('');
                setShowPresetNameModal(true);
              }}
              disabled={themeSelection !== 'custom'}
              title={themeSelection === 'custom'
                ? 'Save current settings as a preset'
                : 'Switch to the Custom theme to enable preset saving'}
            >
              Save Preset
            </button>
          </div>
          <div className="design-header-controls">
            <label className="auto-apply-toggle">
              <input type="checkbox" checked={autoApply} onChange={e => setAutoApply(e.target.checked)} /> Auto apply
            </label>
            <button onClick={() => setDesignModalOpen(false)} title="Close" className="close-btn">✕</button>
          </div>
        </div>

        <div className="design-modal-body">
          <nav className="design-nav">
            {DESIGN_TABS.map(tab => (
              <button
                key={tab.id}
                className={`design-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="design-content">
            {/* Themes Tab */}
            {activeTab === 'themes' && (
              <ThemesTab
                themeSelection={themeSelection}
                setThemeSelection={setThemeSelection}
                customPresets={customPresets}
                setLocal={setLocal}
                scheduleApply={scheduleApply}
                addToast={addToast}
              />
            )}

            {/* Document Tab */}
            {activeTab === 'document' && (
              <DocumentTab local={local} mutate={mutate} />
            )}

            {/* Typography Tab */}
            {activeTab === 'typography' && (
              <TypographyTab local={local} mutate={mutate} />
            )}

            {/* Spacing & Layout Tab */}
            {activeTab === 'spacing' && (
              <SpacingTab local={local} mutate={mutate} />
            )}

            {/* Structure Tab */}
            {activeTab === 'structure' && (
              <StructureTab local={local} mutate={mutate} handleBrowseCoverImage={handleBrowseCoverImage} currentFile={currentFile} />
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <ImagesTab local={local} mutate={mutate} />
            )}

            {/* Presets Tab */}
            {activeTab === 'presets' && (
              <PresetsTab
                themeSelection={themeSelection}
                setThemeSelection={setThemeSelection}
                customPresets={customPresets}
                setShowPresetNameModal={setShowPresetNameModal}
                setPresetNameInput={setPresetNameInput}
                setLocal={setLocal}
                scheduleApply={scheduleApply}
                addToast={addToast}
                deleteCustomPreset={deleteCustomPreset}
                renameCustomPreset={renameCustomPreset}
              />
            )}
          </div>
        </div>

        <div className="design-footer">
          <div>
            {dirty && (
              <div className="dirty-indicator">
                {autoApply ? 'Changes applied live (Custom theme)' : 'Unsaved changes'}
              </div>
            )}
          </div>
          <div className="design-footer-actions">
            <button onClick={handleReset} type="button" className="btn-reset">Reset</button>
            <button onClick={handleCancel} type="button" className="btn-cancel">Cancel</button>
            <button onClick={handleSave} type="button" disabled={!dirty} className="btn-primary">Save</button>
          </div>
        </div>
      </div>

      {/* Preset Name Modal */}
      {showPresetNameModal && (
        <div className="preset-name-modal-overlay" onClick={() => setShowPresetNameModal(false)}>
          <div className="preset-name-modal" onClick={e => e.stopPropagation()}>
            <h3>Save Preset</h3>
            <p className="preset-modal-description">Enter a name for your custom preset</p>
            <input
              type="text"
              className="preset-name-input"
              placeholder="e.g., My Report Template"
              value={presetNameInput}
              onChange={e => setPresetNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && presetNameInput.trim()) {
                  const id = `custom_${Date.now()}`;
                  saveCustomPreset(id, presetNameInput.trim(), local);
                  setThemeSelection(id);
                  addToast({ type: 'success', message: `Preset "${presetNameInput.trim()}" saved successfully` });
                  setShowPresetNameModal(false);
                } else if (e.key === 'Escape') {
                  setShowPresetNameModal(false);
                }
              }}
              autoFocus
            />
            <div className="preset-modal-actions">
              <button
                type="button"
                onClick={() => setShowPresetNameModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!presetNameInput.trim()}
                onClick={() => {
                  if (presetNameInput.trim()) {
                    const id = `custom_${Date.now()}`;
                    saveCustomPreset(id, presetNameInput.trim(), local);
                    setThemeSelection(id);
                    addToast({ type: 'success', message: `Preset "${presetNameInput.trim()}" saved successfully` });
                    setShowPresetNameModal(false);
                  }
                }}
                className="btn-primary"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignModal;
