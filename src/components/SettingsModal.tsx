import React, { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { usePreferencesStore, defaultPreferences } from '../stores/preferencesStore';
import type { Preferences } from '../types';
import './DesignModal.css';
import { AdvancedTab } from './DesignModal/index';
import AboutTab from './DesignModal/AboutTab';

// Settings has its own tab types separate from Design Modal
type SettingsTabSection = 'general' | 'about';

const clonePreferences = (prefs: Preferences): Preferences => ({
  ...prefs,
  margin: { ...prefs.margin },
  fonts: { ...prefs.fonts },
});

const SETTINGS_TABS: { id: SettingsTabSection; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

const SettingsModal: React.FC = () => {
  const { settingsModalOpen, setSettingsModalOpen, settingsModalActiveTab, setSettingsModalActiveTab } = useUIStore();
  const { preferences, setPreferences } = usePreferencesStore();
  const [activeTab, setActiveTab] = useState<SettingsTabSection>('general');
  const [local, setLocal] = useState<Preferences>(() => clonePreferences(preferences));
  const [dirty, setDirty] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const originalRef = React.useRef<Preferences>(clonePreferences(preferences));
  const hasBeenOpenRef = React.useRef(false);

  useEffect(() => {
    if (!settingsModalOpen) {
      hasBeenOpenRef.current = false;
      return;
    }

    const justOpened = !hasBeenOpenRef.current;
    hasBeenOpenRef.current = true;

    if (!justOpened) return;

    const snapshot = clonePreferences(preferences);
    setLocal(snapshot);
    originalRef.current = snapshot;
    setDirty(false);
    setAutoApply(true);

    // Map from Design Modal TabSection to Settings tabs if needed
    if (settingsModalActiveTab) {
      // Settings modal only has 'general' and 'about' tabs
      // If Design Modal tries to open a different tab, default to 'general'
      const tabString = settingsModalActiveTab as string;
      const mappedTab: SettingsTabSection = tabString === 'about' ? 'about' : 'general';
      setActiveTab(mappedTab);
      setSettingsModalActiveTab(null);
    } else {
      setActiveTab('general');
    }
  }, [settingsModalOpen, preferences, settingsModalActiveTab, setSettingsModalActiveTab]);

  useEffect(() => {
    if (!settingsModalOpen || dirty) return;
    setLocal(clonePreferences(preferences));
  }, [preferences, settingsModalOpen, dirty]);

  useEffect(() => {
    if (!settingsModalOpen || !settingsModalActiveTab) return;
    const tabString = settingsModalActiveTab as string;
    const mappedTab: SettingsTabSection = tabString === 'about' ? 'about' : 'general';
    setActiveTab(mappedTab);
    setSettingsModalActiveTab(null);
  }, [settingsModalOpen, settingsModalActiveTab, setSettingsModalActiveTab]);

  useEffect(() => {
    if (!settingsModalOpen) return;

    const handleTabHotkey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;

      const index = parseInt(event.key, 10);
      if (!Number.isInteger(index)) return;

      const tab = SETTINGS_TABS[index - 1];
      if (!tab) return;

      event.preventDefault();
      setActiveTab(tab.id);
    };

    window.addEventListener('keydown', handleTabHotkey);
    return () => {
      window.removeEventListener('keydown', handleTabHotkey);
    };
  }, [settingsModalOpen]);

  if (!settingsModalOpen) return null;

  return (
    <div className="design-modal-overlay" onClick={() => setSettingsModalOpen(false)}>
      <div className="design-modal design-modal-tabbed" onClick={e => e.stopPropagation()}>
        <div className="design-modal-header">
          <h2>Settings</h2>
          <div className="design-header-controls">
            <label className="auto-apply-toggle">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={e => {
                  const nextAuto = e.target.checked;
                  setAutoApply(nextAuto);
                  if (nextAuto && dirty) {
                    const snapshot = clonePreferences(local);
                    setPreferences(snapshot);
                    setLocal(snapshot);
                    setDirty(false);
                  }
                }}
              /> Auto apply
            </label>
            <button onClick={() => setSettingsModalOpen(false)} title="Close" className="close-btn">✕</button>
          </div>
        </div>

        <div className="design-modal-body">
          <nav className="design-nav">
            {SETTINGS_TABS.map(tab => (
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
            {activeTab === 'general' && (
              <AdvancedTab
                local={local as Preferences}
                mutate={(p: Partial<Preferences>) => {
                  const merged = { ...local, ...p } as Preferences;
                  if (autoApply) {
                    const applied = clonePreferences(merged);
                    setLocal(applied);
                    setPreferences(applied);
                    setDirty(false);
                  } else {
                    setLocal(merged);
                    setDirty(true);
                  }
                }}
              />
            )}
            {activeTab === 'about' && <AboutTab />}
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
            <button
              onClick={() => {
                const snapshot = clonePreferences(defaultPreferences);
                setLocal(snapshot);
                if (autoApply) {
                  setPreferences(snapshot);
                  setDirty(false);
                } else {
                  setDirty(true);
                }
              }}
              type="button"
              className="btn-reset"
            >
              Reset
            </button>

            <button
              onClick={() => {
                const snapshot = clonePreferences(originalRef.current ?? preferences);
                setPreferences(snapshot);
                setLocal(snapshot);
                setDirty(false);
                setSettingsModalOpen(false);
              }}
              type="button"
              className="btn-cancel"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                const snapshot = clonePreferences(local);
                setPreferences(snapshot);
                setLocal(snapshot);
                originalRef.current = snapshot;
                setDirty(false);
                setSettingsModalOpen(false);
              }}
              type="button"
              disabled={!dirty}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
