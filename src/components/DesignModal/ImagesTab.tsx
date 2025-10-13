import React from 'react';
import type { TabProps } from './types';

const ImagesTab: React.FC<TabProps> = ({ local, mutate }) => {
  return (
    <div className="tab-panel">
      <h3>Image Defaults</h3>
      <div className="form-grid one-col">
        <label>Default Width
          <div className="slider-group">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={parseInt(local.default_image_width.replace('%', '')) || 80}
              onChange={e => mutate({ default_image_width: `${e.target.value}%` })}
            />
            <input
              type="number"
              className="slider-value-input"
              min="10"
              max="100"
              step="5"
              value={parseInt(local.default_image_width.replace('%', '')) || 80}
              onChange={e => mutate({ default_image_width: `${e.target.value}%` })}
            />
          </div>
          <div className="helper-text">Default width for images inserted into the document</div>
        </label>
        <label>Default Alignment
          <select value={local.default_image_alignment} onChange={e => mutate({ default_image_alignment: e.target.value })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
          <div className="helper-text">Where images are positioned by default</div>
        </label>
      </div>
    </div>
  );
};

export default ImagesTab;
