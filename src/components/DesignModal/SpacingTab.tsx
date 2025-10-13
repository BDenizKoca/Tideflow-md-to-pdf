import React from 'react';
import type { TabProps } from './types';

const SpacingTab: React.FC<TabProps> = ({ local, mutate }) => {
  return (
    <div className="tab-panel">
      <h3>Spacing & Layout</h3>
      <div className="form-grid one-col">
        <label>Line Height
          <div className="slider-group">
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={local.line_height}
              onChange={e => mutate({ line_height: parseFloat(e.target.value) || 1.5 })}
            />
            <input
              type="number"
              className="slider-value-input"
              min="1.0"
              max="2.5"
              step="0.1"
              value={local.line_height}
              onChange={e => mutate({ line_height: parseFloat(e.target.value) || 1.5 })}
            />
          </div>
          <div className="helper-text">Space between lines of text</div>
        </label>
        <label>Paragraph Spacing
          <div className="slider-group">
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.05"
              value={parseFloat(local.paragraph_spacing.replace('em', ''))}
              onChange={e => mutate({ paragraph_spacing: `${e.target.value}em` })}
            />
            <input
              type="text"
              className="slider-value-input"
              value={local.paragraph_spacing}
              onChange={e => mutate({ paragraph_spacing: e.target.value })}
            />
          </div>
          <div className="helper-text">Space between paragraphs</div>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={local.page_numbers}
            onChange={e => mutate({ page_numbers: e.target.checked })}
          />
          <span>Page Numbers</span>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={local.header_title}
            onChange={e => mutate({ header_title: e.target.checked })}
          />
          <span>Document Title in Header</span>
        </label>
        {local.header_title && (
          <label>Header Text
            <input
              placeholder="Enter header text"
              value={local.header_text}
              onChange={e => mutate({ header_text: e.target.value })}
            />
            <div className="helper-text">Text to display in page header</div>
          </label>
        )}
      </div>
    </div>
  );
};

export default SpacingTab;
