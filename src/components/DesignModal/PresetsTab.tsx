import React from 'react';
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
  return (
    <div className="tab-panel">
      <h3>Custom Presets</h3>
      <div className="form-grid one-col">
        <button
          type="button"
          className="btn-save-preset"
          disabled={themeSelection !== 'custom'}
          onClick={() => {
            setPresetNameInput('');
            setShowPresetNameModal(true);
          }}
        >
          💾 Save Current Settings as Preset
        </button>
        <div className="helper-text">
          {themeSelection !== 'custom'
            ? 'Switch to Custom theme to save your settings as a preset'
            : 'Save your current design settings as a reusable preset'}
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
