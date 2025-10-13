import React from 'react';
import type { TabProps } from './types';

const DocumentTab: React.FC<TabProps> = ({ local, mutate }) => {
  return (
    <div className="tab-panel">
      <h3>Document Settings</h3>
      <div className="form-grid one-col">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={local.two_column_layout || false}
            onChange={e => mutate({ two_column_layout: e.target.checked })}
          />
          <span>Two-Column Layout</span>
        </label>
        <label>Paper Size
          <select value={local.papersize} onChange={e => mutate({ papersize: e.target.value })}>
            <option value="a4">A4 (210 × 297 mm)</option>
            <option value="us-letter">US Letter (8.5 × 11 in)</option>
            <option value="us-legal">US Legal (8.5 × 14 in)</option>
          </select>
        </label>
        <label>Horizontal Margin
          <div className="slider-group">
            <input
              type="range"
              min="1"
              max="5"
              step="0.25"
              value={parseFloat(local.margin.x.replace('cm', '').replace('in',''))}
              onChange={e => mutate({ margin: { ...local.margin, x: `${e.target.value}cm` } })}
            />
            <input
              type="text"
              className="slider-value-input"
              value={local.margin.x}
              onChange={e => mutate({ margin: { ...local.margin, x: e.target.value } })}
            />
          </div>
          <div className="helper-text">Left and right page margins</div>
        </label>
        <label>Vertical Margin
          <div className="slider-group">
            <input
              type="range"
              min="1"
              max="5"
              step="0.25"
              value={parseFloat(local.margin.y.replace('cm', '').replace('in',''))}
              onChange={e => mutate({ margin: { ...local.margin, y: `${e.target.value}cm` } })}
            />
            <input
              type="text"
              className="slider-value-input"
              value={local.margin.y}
              onChange={e => mutate({ margin: { ...local.margin, y: e.target.value } })}
            />
          </div>
          <div className="helper-text">Top and bottom page margins</div>
        </label>
      </div>
    </div>
  );
};

export default DocumentTab;
