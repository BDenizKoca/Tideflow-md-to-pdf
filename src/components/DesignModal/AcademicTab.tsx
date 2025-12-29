import React from 'react';
import type { TabProps } from './types';

interface AcademicTabProps extends TabProps {
  handleBrowseBibliography: () => void;
  handleClearBibliography: () => void;
}

const AcademicTab: React.FC<AcademicTabProps> = ({
  local,
  mutate,
  handleBrowseBibliography,
  handleClearBibliography
}) => {
  return (
    <div className="tab-panel">
      <h3>Academic Settings</h3>
      <div className="form-grid one-col">

        {/* Bibliography File */}
        <label>Bibliography File
          <div className="input-with-button">
            <input
              placeholder="No bibliography file selected"
              value={local.bibliography_path || ''}
              onChange={e => mutate({ bibliography_path: e.target.value })}
              readOnly
            />
            <button type="button" onClick={handleBrowseBibliography}>
              Browse…
            </button>
            {local.bibliography_path && (
              <button
                type="button"
                onClick={handleClearBibliography}
                title="Clear bibliography file"
              >
                ✕
              </button>
            )}
          </div>
          <div className="helper-text">
            Select a .bib (BibTeX) or .yml (Hayagriva) file for citations
          </div>
        </label>

        {/* Citation Style */}
        {local.bibliography_path && (
          <>
            <label>Citation Style
              <select
                value={local.bibliography_style || 'ieee'}
                onChange={e => mutate({ bibliography_style: e.target.value })}
              >
                <option value="ieee">IEEE</option>
                <option value="apa">APA</option>
                <option value="chicago-author-date">Chicago (Author-Date)</option>
                <option value="chicago-notes">Chicago (Notes)</option>
                <option value="mla">MLA</option>
                <option value="vancouver">Vancouver</option>
                <option value="harvard-cite-them-right">Harvard</option>
              </select>
              <div className="helper-text">
                Citation format for references
              </div>
            </label>

            <label>References Heading (Optional)
              <input
                placeholder="Leave blank for default"
                value={local.bibliography_title || ''}
                onChange={e => mutate({ bibliography_title: e.target.value })}
              />
              <div className="helper-text">
                Custom heading for bibliography section (default: "References")
              </div>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={local.bibliography_show_all || false}
                onChange={e => mutate({ bibliography_show_all: e.target.checked })}
              />
              <span>Show All Entries</span>
            </label>
            <div className="helper-text" style={{ marginTop: '-8px', marginLeft: '28px' }}>
              Include all bibliography entries, not just cited works
            </div>
          </>
        )}

        {/* Usage Instructions */}
        <div className="helper-text" style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '4px' }}>
          <strong>How to cite:</strong>
          <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
            <li>In text: <code>[@citation-key]</code></li>
            <li>With page: <code>[@citation-key, p. 42]</code></li>
            <li>Multiple: <code>[@key1; @key2]</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AcademicTab;
