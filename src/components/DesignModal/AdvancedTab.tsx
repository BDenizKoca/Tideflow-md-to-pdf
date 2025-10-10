import React, { useEffect, useState } from 'react';
import type { TabProps } from './types';
import * as api from '../../api';
import './AdvancedTab.css';

const AdvancedTab: React.FC<TabProps> = ({ local, mutate }) => {
  const [typstPath, setTypstPath] = useState<string | undefined>(local.typst_path || '');
  const [diag, setDiag] = useState<string>('');
  const [detected, setDetected] = useState<string | null>(null);
  const [status, setStatus] = useState<'ok' | 'warn' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);

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
      <h3>Advanced Settings</h3>
      <div className="form-grid one-col">
        <label>Render Debounce
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
          <div className="helper-text">Delay (in milliseconds) before re-rendering PDF while typing</div>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={local.preserve_scroll_position} onChange={e => mutate({ preserve_scroll_position: (e.target as HTMLInputElement).checked })} />
          <span>Preserve Scroll Position</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={local.confirm_exit_on_unsaved} onChange={e => mutate({ confirm_exit_on_unsaved: (e.target as HTMLInputElement).checked })} />
          <span>Confirm Exit on Unsaved Changes</span>
        </label>

        <div className="design-section">
          <h3>Typst binary</h3>
          <label>
            Typst binary (optional)
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
            <div className="helper-text">Optional: point to Typst binary as a fallback if automatic detection fails.</div>

            <div className="typst-info">
              <strong>Auto-detected:</strong>{' '}
              {detected ? (
                <span>{detected} <span className={`typst-status-badge ${status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'error'}`}>{status?.toUpperCase() ?? ''}</span></span>
              ) : (
                <span>None <span className="typst-status-badge warn">FALLBACK</span></span>
              )}
              {local.typst_path ? (
                <div className="helper-text">User fallback path is configured: <code>{local.typst_path}</code></div>
              ) : null}
            </div>
          </label>
        </div>

        {diag && (
          <pre className="typst-diagnostics">{diag}</pre>
        )}
      </div>
    </div>
  );
};

export default AdvancedTab;
