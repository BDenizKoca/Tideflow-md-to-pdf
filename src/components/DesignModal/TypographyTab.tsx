import React from 'react';
import type { TabProps } from './types';

const TypographyTab: React.FC<TabProps> = ({ local, mutate }) => {
  return (
    <div className="tab-panel">
      <h3>Typography</h3>
      <div className="form-grid one-col">
        <label>Body Font
          <select
            value={local.fonts.main}
            onChange={e => mutate({ fonts: { ...local.fonts, main: e.target.value } })}
          >
            <option value="Segoe UI">Segoe UI</option>
            <option value="Arial">Arial</option>
            <option value="Calibri">Calibri</option>
            <option value="Cambria">Cambria</option>
            <option value="Candara">Candara</option>
            <option value="Constantia">Constantia</option>
            <option value="Corbel">Corbel</option>
            <option value="Georgia">Georgia</option>
            <option value="Palatino Linotype">Palatino Linotype</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
            <option value="Verdana">Verdana</option>
          </select>
          <div className="font-preview" data-font-role="body" data-font-value={local.fonts.main}>{`Aa Bb Cc 123 \u2014 ${local.fonts.main}`}</div>
        </label>
        <label>Code / Monospace Font
          <select
            value={local.fonts.mono}
            onChange={e => mutate({ fonts: { ...local.fonts, mono: e.target.value } })}
          >
            <option value="Consolas">Consolas</option>
            <option value="Courier New">Courier New</option>
            <option value="Lucida Console">Lucida Console</option>
          </select>
          <div className="font-preview" data-font-role="mono" data-font-value={local.fonts.mono}>{`code {sample} <tag/> \u2014 ${local.fonts.mono}`}</div>
          <div className="helper-text">Used for code blocks and inline code</div>
        </label>
        <label>Font Size
          <div className="slider-group">
            <input
              type="range"
              min="8"
              max="18"
              step="0.5"
              value={local.font_size}
              onChange={e => mutate({ font_size: parseFloat(e.target.value) || 11 })}
            />
            <input
              type="number"
              className="slider-value-input"
              min="8"
              max="18"
              step="0.5"
              value={local.font_size}
              onChange={e => mutate({ font_size: parseFloat(e.target.value) || 11 })}
            />
          </div>
          <div className="helper-text">Base font size in points</div>
        </label>
        <label>Heading Scale
          <div className="slider-group">
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={local.heading_scale}
              onChange={e => mutate({ heading_scale: parseFloat(e.target.value) })}
            />
            <input
              type="number"
              className="slider-value-input"
              min="0.8"
              max="1.5"
              step="0.05"
              value={local.heading_scale.toFixed(2)}
              onChange={e => mutate({ heading_scale: parseFloat(e.target.value) || 1.2 })}
            />
          </div>
          <div className="helper-text">How much larger headings are relative to body text</div>
        </label>
        <label>Page Background
          <div className="color-group">
            <input
              type="color"
              value={local.page_bg_color}
              onChange={e => mutate({ page_bg_color: e.target.value })}
            />
            <input
              type="text"
              className="color-hex-input"
              value={local.page_bg_color}
              onChange={e => mutate({ page_bg_color: e.target.value })}
            />
          </div>
        </label>
        <label>Font Color
          <div className="color-group">
            <input
              type="color"
              value={local.font_color}
              onChange={e => mutate({ font_color: e.target.value })}
            />
            <input
              type="text"
              className="color-hex-input"
              value={local.font_color}
              onChange={e => mutate({ font_color: e.target.value })}
            />
          </div>
        </label>
        <label>Accent Color
          <div className="color-group">
            <input
              type="color"
              value={local.accent_color}
              onChange={e => mutate({ accent_color: e.target.value })}
            />
            <input
              type="text"
              className="color-hex-input"
              value={local.accent_color}
              onChange={e => mutate({ accent_color: e.target.value })}
            />
          </div>
          <div className="helper-text">Used for links and highlights</div>
        </label>
      </div>
    </div>
  );
};

export default TypographyTab;
