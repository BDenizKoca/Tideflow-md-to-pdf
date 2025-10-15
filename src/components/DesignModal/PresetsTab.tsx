import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import type { Preferences, Toast } from '../../types';

interface PresetsTabProps {
  themeSelection: string;
  setThemeSelection: (theme: string) => void;
  customPresets: Record<string, { name: string; preferences: Preferences }>;
  setShowPresetNameModal: (show: boolean) => void;
  setPresetNameInput: (name: string) => void;
  setLocal: (prefs: Preferences) => void;
  scheduleApply: (prefs: Preferences) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  deleteCustomPreset: (id: string) => void;
  renameCustomPreset: (id: string, name: string) => void;
}

const PresetsTab: React.FC<PresetsTabProps> = ({
  themeSelection,
  setThemeSelection,
  customPresets,
  setShowPresetNameModal,
  setPresetNameInput,
  setLocal,
  scheduleApply,
  addToast,
  deleteCustomPreset,
  renameCustomPreset
}) => {
  const setSettingsModalOpen = useUIStore((state) => state.setSettingsModalOpen);
  const setSettingsModalActiveTab = useUIStore((state) => state.setSettingsModalActiveTab);
  return (
    <div className="tab-panel">
      <h3>Custom Presets</h3>
      <div className="form-grid one-col">
        <div className="preset-actions-grid">
          <div className="preset-action-item">
            <button
              type="button"
              className="btn-preset-export"
              onClick={() => {
                setSettingsModalActiveTab('about');
                setSettingsModalOpen(true);
              }}
              title="Export current theme as a preset file"
            >
              📤 Export Theme
            </button>
            <p className="action-description">Save the current theme settings to a file that you can share or import later.</p>
          </div>
          <div className="preset-action-item">
            <button
              type="button"
              className="btn-preset-import"
              onClick={() => {
                setSettingsModalActiveTab('about');
                setSettingsModalOpen(true);
              }}
              title="Import custom preset as a theme"
            >
              📥 Import Theme
            </button>
            <p className="action-description">Load a theme from a preset file. This will overwrite your current settings.</p>
          </div>
          <div className="preset-action-item">
            <button
              type="button"
              className="btn-save-preset"
              disabled={themeSelection !== 'custom'}
              onClick={() => {
                setPresetNameInput('');
                setShowPresetNameModal(true);
              }}
              title="Save current settings as a preset"
            >
              💾 Save as Preset
            </button>
            <p className="action-description">
              {themeSelection !== 'custom'
                ? 'Switch to the Custom theme to save your settings as a new preset.'
                : 'Save your current design settings as a reusable preset for easy access.'}
            </p>
          </div>
        </div>
      </div>

      {Object.keys(customPresets).length === 0 ? (
        <div className="empty-presets">
          <p>No custom presets saved yet.</p>
          <p>Adjust your settings and save them as a reusable preset!</p>
        </div>
      ) : (
        <div className="presets-list">
          <h4 className="presets-list-title">Saved Presets</h4>
          {Object.entries(customPresets).map(([id, preset]) => (
            <div key={id} className="preset-item">
              <div className="preset-info">
                <h4>{preset.name}</h4>
                <p className="preset-details">
                  {preset.preferences.fonts.main} • {preset.preferences.font_size}pt • {preset.preferences.papersize.toUpperCase()}
                </p>
              </div>
              <div className="preset-actions">
                <button
                  type="button"
                  className="btn-preset-load"
                  onClick={() => {
                    setThemeSelection(id);
                    const merged: Preferences = {
                      ...preset.preferences,
                      margin: { ...preset.preferences.margin },
                      fonts: { ...preset.preferences.fonts },
                    };
                    setLocal(merged);
                    scheduleApply(merged);
                    addToast({ type: 'success', message: `Loaded preset "${preset.name}"` });
                  }}
                  title="Load this preset"
                >
                  📂 Load
                </button>
                <button
                  type="button"
                  className="btn-preset-rename"
                  onClick={() => {
                    const newName = prompt('Enter new name:', preset.name);
                    if (newName && newName.trim() && newName !== preset.name) {
                      renameCustomPreset(id, newName.trim());
                      addToast({ type: 'success', message: `Preset renamed to "${newName.trim()}"` });
                    }
                  }}
                  title="Rename this preset"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="btn-preset-delete"
                  onClick={() => {
                    if (confirm(`Delete preset "${preset.name}"?`)) {
                      deleteCustomPreset(id);
                      if (themeSelection === id) {
                        // Switch to "Custom" mode without changing settings
                        setThemeSelection('custom');
                      }
                      addToast({ type: 'success', message: `Preset "${preset.name}" deleted` });
                    }
                  }}
                  title="Delete this preset"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresetsTab;