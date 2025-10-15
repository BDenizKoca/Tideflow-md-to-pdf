import React, { useEffect, useState } from 'react';
import type { TabProps } from './types';
import * as api from '../../api';
import type { UIThemeId } from '../../styles/themes';
import './AdvancedTab.css';

import { usePreferencesStore } from '../../stores/preferencesStore';
interface AdvancedTabProps extends TabProps {
  setDirty: (dirty: boolean) => void;
  pendingUITheme: string | null;
  setPendingUITheme: (theme: string) => void;
}
const AdvancedTab: React.FC<AdvancedTabProps> = ({ local, mutate, setDirty, pendingUITheme, setPendingUITheme }) => {
  const autoApply = usePreferencesStore((state) => state.autoApply);
  const setPreferences = usePreferencesStore((state) => state.setPreferences);
  const [typstPath, setTypstPath] = useState<string | undefined>(local.typst_path || '');
  const [diag, setDiag] = useState<string>('');
  const [detected, setDetected] = useState<string | null>(null);
  const [status, setStatus] = useState<'ok' | 'warn' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const globalUITheme = usePreferencesStore((state) => state.uiTheme);
  const setUITheme = usePreferencesStore((state) => state.setUITheme);
  const [localTheme, setLocalTheme] = useState<UIThemeId>(globalUITheme);

  useEffect(() => {
    if (autoApply) {
      setLocalTheme(globalUITheme);
    }
  }, [autoApply, globalUITheme]);

  useEffect(() => {
    if (pendingUITheme && !autoApply) {
      setLocalTheme(pendingUITheme as UIThemeId);
    }
  }, [pendingUITheme, autoApply]);

  const pickFile = async () => {
    const picked = await api.showOpenDialog([{ name: 'Executable', extensions: ['*'] }], false);
    if (picked) {
      setTypstPath(picked);
      mutate({ typst_path: picked });
    }
  };

  const detectNow = async () => {
    try {
      const res = await api.typstDiagnostics();
      setDiag(JSON.stringify(res, null, 2));
      if (res.detected_binary) {
        setTypstPath(res.detected_binary);
        mutate({ typst_path: res.detected_binary });
        setDetected(res.detected_binary);
        setStatus('ok');
      }
    } catch (e) {
      setDiag(String(e));
      setStatus('error');
    }
  };

  const savePrefs = async () => {
    // Grab current preferences, update typst_path, and persist
    setSaving(true);
    try {
      const prefs = await api.getPreferences();
      prefs.typst_path = typstPath?.trim().replace(/[\\/]+$/, '');
      // Before persisting, validate the provided path (or at least run diagnostics)
      const diagRes = await api.typstDiagnostics();
      // Friendly result: prefer detected_binary from diagnostics; if user provided path doesn't match detected, warn
      setDiag(JSON.stringify(diagRes, null, 2));
      if (diagRes.detected_binary) {
        setDetected(diagRes.detected_binary);
      }

      // If the diagnostics returned an error, set status accordingly
      if (diagRes.error) {
        setStatus('warn');
      } else if (diagRes.detected_binary) {
        setStatus('ok');
      } else {
        setStatus('warn');
      }

      await api.setPreferences(prefs);
      await api.applyPreferences();
    } catch (err) {
      setDiag(String(err));
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // On mount, fetch diagnostics to show current auto-detected binary
    (async () => {
      try {
        const res = await api.typstDiagnostics();
        setDiag(JSON.stringify(res, null, 2));
        setDetected(res.detected_binary ?? null);
        setStatus(res.detected_binary ? 'ok' : (res.error ? 'error' : 'warn'));
      } catch (e) {
        setDiag(String(e));
        setStatus('error');
      }
    })();
  }, []);

  return (
    <div className="tab-panel">
      <h3>General Settings</h3>

      <div className="form-grid one-col">
        <div className="design-section">
          <h4>Appearance</h4>
          <div className="theme-toggle-group">
            {(['dark', 'light'] as UIThemeId[]).map((themeId) => (
              <label
                key={themeId}
                className="theme-toggle-option"
                data-active={(autoApply ? globalUITheme : localTheme) === themeId}
              >
                <input
                  type="radio"
                  name="ui-theme-toggle"
                  value={themeId}
                  checked={(autoApply ? globalUITheme : localTheme) === themeId}
                  onChange={() => {
                    if (autoApply) {
                      setUITheme(themeId);
                    } else {
                      setDirty(true);
                      setLocalTheme(themeId);
                      setPendingUITheme(themeId);
                    }
                  }}
                />
                <span>{themeId === 'dark' ? 'Dark' : 'Light'}</span>
              </label>
            ))}
          </div>
          <div className="helper-text">Toggle the interface between dark and light modes</div>
        </div>

        <div className="design-section">
          <h4>Editor Behavior</h4>
          <label className="checkbox-label">
            <input type="checkbox" checked={local.preserve_scroll_position} onChange={e => {
              const checked = (e.target as HTMLInputElement).checked;
              if (autoApply) {
                mutate({ preserve_scroll_position: checked });
                setPreferences({ ...local, preserve_scroll_position: checked });
              } else {
                mutate({ preserve_scroll_position: checked });
                setDirty(true);
              }
            }} />
            <span>Preserve scroll position after re-render</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={local.confirm_exit_on_unsaved} onChange={e => {
              const checked = (e.target as HTMLInputElement).checked;
              if (autoApply) {
                mutate({ confirm_exit_on_unsaved: checked });
                setPreferences({ ...local, confirm_exit_on_unsaved: checked });
              } else {
                mutate({ confirm_exit_on_unsaved: checked });
                setDirty(true);
              }
            }} />
            <span>Confirm before closing with unsaved changes</span>
          </label>
        </div>

        <div className="design-section">
          <h4>Performance</h4>
          <label>Render Delay
            <div className="slider-group">
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={local.render_debounce_ms}
                onChange={e => mutate({ render_debounce_ms: parseInt((e.target as HTMLInputElement).value || '400', 10) })}
              />
              <input
                type="number"
                className="slider-value-input"
                min="100"
                max="2000"
                step="100"
                value={local.render_debounce_ms}
                onChange={e => mutate({ render_debounce_ms: parseInt((e.target as HTMLInputElement).value || '400', 10) })}
              />
            </div>
            <div className="helper-text">Milliseconds to wait before re-rendering PDF while typing</div>
          </label>
        </div>

        <div className="design-section">
          <h4>Typst Compiler</h4>
          <label>
            Typst Binary Path (optional)
            <div className="typst-path-row">
              <input
                type="text"
                value={typstPath}
                onChange={e => setTypstPath((e.target as HTMLInputElement).value)}
                placeholder="/usr/bin/typst or C:\\path\\to\\typst.exe"
                className="typst-path-input"
              />
              <div className="typst-path-actions">
                <button type="button" onClick={pickFile}>Browse</button>
                <button type="button" onClick={detectNow}>Detect now</button>
                <button type="button" className="btn-primary" onClick={savePrefs} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
            <div className="helper-text">Optional fallback path if automatic detection fails</div>

            <div className="typst-info">
              <strong>Auto-detected:</strong>{' '}
              {detected ? (
                <span>{detected} <span className={`typst-status-badge ${status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'error'}`}>{status?.toUpperCase() ?? ''}</span></span>
              ) : (
                <span>None <span className="typst-status-badge warn">FALLBACK</span></span>
              )}
              {local.typst_path && (
                <div className="helper-text">Custom path: <code>{local.typst_path}</code></div>
              )}
            </div>
          </label>

          {diag && (
            <details className="typst-diagnostics-details">
              <summary>Diagnostics</summary>
              <pre className="typst-diagnostics">{diag}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedTab;
