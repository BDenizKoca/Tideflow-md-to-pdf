import React from 'react';
import { UI } from '../constants/timing';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import type { SyncMode, Preferences } from '../types';
import { themePresets } from '../themes';
import { setPreferences as persistPreferences, renderTypst, openPdfInViewer } from '../api';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';

const PDFPreviewHeaderLogger = logger.createScoped('PDFPreviewHeader');

interface Props {
  pdfZoom: number;
  setPdfZoom: (zoom: number) => void;
}

const PDFPreviewHeader: React.FC<Props> = ({ pdfZoom, setPdfZoom }) => {
  const syncMode = useEditorStore((state) => state.syncMode);
  const setSyncMode = useEditorStore((state) => state.setSyncMode);
  const syncEnabled = useEditorStore((state) => state.syncEnabled);
  const setSyncEnabled = useEditorStore((state) => state.setSyncEnabled);
  const compileStatus = useEditorStore((state) => state.editor.compileStatus);
  const setCompileStatus = useEditorStore((s) => s.setCompileStatus);
  const addToast = useUIStore((state) => state.addToast);
  const thumbnailsVisible = useUIStore((state) => state.thumbnailsVisible);
  const setThumbnailsVisible = useUIStore((state) => state.setThumbnailsVisible);
  const setDesignModalOpen = useUIStore((s) => s.setDesignModalOpen);
  const {
    themeSelection,
    setThemeSelection,
    setPreferences,
    customPresets,
  } = usePreferencesStore();
  
  const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const currentZoomIndex = zoomLevels.indexOf(pdfZoom);
  
  const rerenderCurrent = async () => {
    const { editor: { currentFile, content } } = useEditorStore.getState();
    if (!currentFile) return;
    // Always use renderTypst with current editor content for live preview
    await renderTypst(content, 'pdf', currentFile);
  };

  const handleThemeSelect = async (value: string) => {
    setThemeSelection(value);
    if (value === 'custom') {
      const { lastCustomPreferences } = usePreferencesStore.getState();
      const snapshot: Preferences = {
        ...lastCustomPreferences,
        margin: { ...lastCustomPreferences.margin },
        fonts: { ...lastCustomPreferences.fonts },
      };
      try {
        setCompileStatus({ status: 'running' });
        setPreferences(snapshot);
        await persistPreferences(snapshot);
        await rerenderCurrent();
      } catch (e) {
        PDFPreviewHeaderLogger.warn('custom apply failed', e);
        handleError(e, { operation: 'apply custom preferences', component: 'PDFPreviewHeader' }, 'warning');
      }
      setDesignModalOpen(true);
      return;
    }

    // Check if it's a custom preset
    const customPreset = customPresets[value];
    if (customPreset) {
      try {
        setCompileStatus({ status: 'running' });
        setPreferences(customPreset.preferences);
        await persistPreferences(customPreset.preferences);
        await rerenderCurrent();
      } catch (e) {
        PDFPreviewHeaderLogger.warn('custom preset apply failed', e);
        handleError(e, { operation: 'apply custom preset', component: 'PDFPreviewHeader' }, 'warning');
      }
      return;
    }

    // Otherwise it's a built-in theme
    const preset = themePresets[value];
    if (preset) {
      try {
        setCompileStatus({ status: 'running' });
        setPreferences(preset.preferences);
        await persistPreferences(preset.preferences);
        await rerenderCurrent();
      } catch (e) {
        PDFPreviewHeaderLogger.warn('theme apply failed', e);
        handleError(e, { operation: 'apply theme', component: 'PDFPreviewHeader' }, 'warning');
      }
    }
  };
  
  return (
    <div className="pdf-preview-header">
      <div className="pdf-preview-actions sync-controls">
        <div className="zoom-controls">
          <button
            type="button"
            onClick={() => {
              const currentIndex = zoomLevels.indexOf(pdfZoom);
              if (currentIndex > 0) {
                setPdfZoom(zoomLevels[currentIndex - 1]);
              }
            }}
            title="Zoom out"
            className="zoom-btn"
            disabled={currentZoomIndex === 0}
          >
            −
          </button>
          <span className="zoom-display" title="Current zoom level">
            {Math.round(pdfZoom * UI.ZOOM_PERCENTAGE_MULTIPLIER)}%
          </span>
          <button
            type="button"
            onClick={() => {
              const currentIndex = zoomLevels.indexOf(pdfZoom);
              if (currentIndex < zoomLevels.length - 1) {
                setPdfZoom(zoomLevels[currentIndex + 1]);
              }
            }}
            title="Zoom in"
            className="zoom-btn"
            disabled={currentZoomIndex === zoomLevels.length - 1}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setPdfZoom(1.0)}
            title="Reset zoom to 100%"
            className="zoom-reset-btn"
            disabled={pdfZoom === 1.0}
          >
            Reset
          </button>
        </div>
        <div className="toolbar-separator"></div>
        <button
          onClick={() => setDesignModalOpen(true)}
          title="Open Design & Layout (Ctrl+,)"
        >
          🎨 Design
        </button>
        <select
          value={themeSelection}
          onChange={(e) => handleThemeSelect(e.target.value)}
          title="Select Theme"
          className="toolbar-select"
        >
          {Object.entries(themePresets).map(([id, theme]) => (
            <option key={id} value={id} title={theme.description}>{theme.name}</option>
          ))}
          {Object.keys(customPresets).length > 0 && <option disabled>──────────</option>}
          {Object.entries(customPresets).map(([id, preset]) => (
            <option key={id} value={id}>{preset.name} ⭐</option>
          ))}
          {themeSelection === 'custom' && <option value="custom">Custom</option>}
        </select>
        <div className="toolbar-button-group">
          <button
            onClick={async () => {
              const prefs = usePreferencesStore.getState().preferences;
              const newSize = Math.max(8, prefs.font_size - 0.5);
              const updated = { ...prefs, font_size: newSize };
              try {
                setCompileStatus({ status: 'running' });
                setThemeSelection('custom');
                setPreferences(updated);
                await persistPreferences(updated);
                await rerenderCurrent();
              } catch (e) {
                PDFPreviewHeaderLogger.warn('font size decrease failed', e);
                handleError(e, { operation: 'decrease font size', component: 'PDFPreviewHeader' }, 'warning');
              }
            }}
            title="Decrease font size"
          >
            A−
          </button>
          <button
            onClick={async () => {
              const prefs = usePreferencesStore.getState().preferences;
              const newSize = Math.min(18, prefs.font_size + 0.5);
              const updated = { ...prefs, font_size: newSize };
              try {
                setCompileStatus({ status: 'running' });
                setThemeSelection('custom');
                setPreferences(updated);
                await persistPreferences(updated);
                await rerenderCurrent();
              } catch (e) {
                PDFPreviewHeaderLogger.warn('font size increase failed', e);
                handleError(e, { operation: 'increase font size', component: 'PDFPreviewHeader' }, 'warning');
              }
            }}
            title="Increase font size"
          >
            A+
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const newMode: SyncMode = syncMode === 'two-way' ? 'auto' : 'two-way';
            setSyncMode(newMode);
            addToast({ 
              type: 'success', 
              message: newMode === 'two-way' ? 'Two-way sync enabled' : 'One-way sync enabled' 
            });
          }}
          title={syncMode === 'two-way' ? 'Switch to one-way sync' : 'Enable two-way sync (PDF scroll updates editor)'}
          className="sync-mode-btn"
        >
          {syncMode === 'two-way' ? '⇅' : '⇊'}
        </button>
        <button
          type="button"
          onClick={() => {
            const newEnabled = !syncEnabled;
            setSyncEnabled(newEnabled);
            addToast({ 
              type: 'info', 
              message: newEnabled ? 'Scroll sync enabled' : 'Scroll sync disabled' 
            });
          }}
          title={syncEnabled ? 'Disable scroll synchronization' : 'Enable scroll synchronization'}
          className={`sync-toggle-btn ${syncEnabled ? 'sync-enabled' : 'sync-disabled'}`}
        >
          {syncEnabled ? '🔗' : '⛓️‍💥'}
        </button>
        <div className="toolbar-separator"></div>
        <button
          type="button"
          onClick={async () => {
            // Send PDF directly to default printer
            const pdfPath = compileStatus.pdf_path;
            if (pdfPath) {
              try {
                await openPdfInViewer(pdfPath);
                addToast({ 
                  type: 'success', 
                  message: 'PDF sent to printer' 
                });
              } catch (error) {
                addToast({ 
                  type: 'error', 
                  message: `Failed to print PDF: ${error}` 
                });
              }
            } else {
              addToast({ 
                type: 'error', 
                message: 'No PDF available to print' 
              });
            }
          }}
          title="Print PDF to default printer"
          className="sync-mode-btn"
          disabled={!compileStatus.pdf_path || compileStatus.status !== 'ok'}
        >
          🖨️
        </button>
        <button
          type="button"
          onClick={() => setThumbnailsVisible(!thumbnailsVisible)}
          title={thumbnailsVisible ? 'Hide page thumbnails' : 'Show page thumbnails'}
          className="sync-mode-btn"
        >
          📑
        </button>
      </div>
    </div>
  );
};

export default PDFPreviewHeader;
