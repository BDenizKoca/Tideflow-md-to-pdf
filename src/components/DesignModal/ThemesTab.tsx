import React, { useMemo, useRef } from 'react';
import { themePresets } from '../../themes';
import type { Preferences, Toast } from '../../types';
import ThemePreview from './ThemePreview';

interface ThemesTabProps {
  themeSelection: string;
  setThemeSelection: (theme: string) => void;
  customPresets: Record<string, { name: string; preferences: Preferences }>;
  setLocal: (prefs: Preferences) => void;
  scheduleApply: (prefs: Preferences) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const sanitizeCssValue = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  return value.replace(/[^#%(),.\-a-zA-Z0-9\s]/g, '').trim() || fallback;
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_COLOR_REGEX = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)$/i;

const sanitizeColor = (value: string | undefined, fallback: string) => {
  const sanitized = sanitizeCssValue(value, fallback);
  if (HEX_COLOR_REGEX.test(sanitized) || RGB_COLOR_REGEX.test(sanitized)) {
    return sanitized;
  }
  return fallback;
};

const parseHex = (color: string): [number, number, number] | null => {
  const match = color.match(/^#([0-9a-fA-F]+)$/);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return [r, g, b];
};

const parseRgb = (color: string): [number, number, number] | null => {
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return [r, g, b];
};

const isColorDark = (color: string): boolean => {
  const rgb = parseHex(color) ?? parseRgb(color);
  if (!rgb) return false;
  const [r, g, b] = rgb.map((channel) => channel / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.45;
};

const parseNumeric = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const num = parseFloat(match[0]);
  return Number.isNaN(num) ? undefined : num;
};

const computeLayout = (preferences: Preferences) => {
  const marginX = parseNumeric(preferences.margin?.x) ?? 2.5;
  if (marginX <= 2) return 'dense';
  if (marginX >= 3.5) return 'spacious';
  return 'regular';
};

const parsePercentage = (value: string | undefined, fallback: number) => {
  const numeric = parseNumeric(value);
  if (numeric === undefined) return fallback;
  return Math.min(100, Math.max(20, numeric));
};

const parseHeadingScale = (scale: Preferences['heading_scale']) => {
  if (typeof scale === 'number' && Number.isFinite(scale)) {
    return scale;
  }
  if (typeof scale === 'string') {
    const numeric = parseFloat(scale);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return 1;
};

const getPreviewConfig = (preferences: Preferences) => {
  const pageColor = sanitizeColor(preferences.page_bg_color, '#f8fafc');
  const fontColor = sanitizeColor(preferences.font_color, '#1f2937');
  const accentColor = sanitizeColor(preferences.accent_color, '#2563eb');

  return {
    pageColor,
    fontColor,
    accentColor,
    isDarkPage: isColorDark(pageColor),
    twoColumn: Boolean(preferences.two_column_layout),
    layout: computeLayout(preferences) as 'dense' | 'regular' | 'spacious',
    imageWidth: parsePercentage(preferences.default_image_width, 72),
    headingScale: parseHeadingScale(preferences.heading_scale),
  };
};

const ThemesTab: React.FC<ThemesTabProps> = ({
  themeSelection,
  setThemeSelection,
  customPresets,
  setLocal,
  scheduleApply,
  addToast,
}) => {
  const handleThemeSelect = (themeId: string) => {
    setThemeSelection(themeId);

    const customPreset = customPresets[themeId];
    const builtInTheme = themePresets[themeId];

    if (customPreset) {
      const merged: Preferences = {
        ...customPreset.preferences,
        margin: { ...customPreset.preferences.margin },
        fonts: { ...customPreset.preferences.fonts },
      };
      setLocal(merged);
      scheduleApply(merged);
      addToast({ type: 'success', message: `Applied "${customPreset.name}" preset` });
    } else if (builtInTheme) {
      const merged: Preferences = {
        ...builtInTheme.preferences,
        margin: { ...builtInTheme.preferences.margin },
        fonts: { ...builtInTheme.preferences.fonts },
      };
      setLocal(merged);
      scheduleApply(merged);
      addToast({ type: 'success', message: `Applied "${builtInTheme.name}" theme` });
    }
  };

  const customPresetEntries = useMemo(() => {
    return Object.entries(customPresets).map(([id, preset]) => ({
      id,
      preset,
      preview: getPreviewConfig(preset.preferences),
    }));
  }, [customPresets]);

  const themeGalleryRef = useRef<HTMLDivElement>(null);
  const customGalleryRef = useRef<HTMLDivElement>(null);

  const scrollGallery = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    const scrollAmount = 200;
    const currentScroll = ref.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    ref.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  return (
    <div className="tab-panel themes-tab">
      <h3>Theme Gallery</h3>
      <p className="helper-text theme-gallery-description">
        Choose a pre-designed theme as a starting point for your document
      </p>

      <div className="theme-gallery-container">
        <button 
          type="button" 
          className="theme-nav-btn theme-nav-left"
          onClick={() => scrollGallery(themeGalleryRef, 'left')}
          title="Scroll left"
        >
          ‹
        </button>
        <div className="theme-gallery" ref={themeGalleryRef}>
        {Object.entries(themePresets).map(([id, theme]) => (
          <button
            key={id}
            type="button"
            className={`theme-card ${themeSelection === id ? 'active' : ''}`}
            onClick={() => handleThemeSelect(id)}
            title={theme.description}
          >
            <div className="theme-preview">
              <img
                src={`/theme-thumbnails/${id}.jpg`}
                alt={`${theme.name} preview`}
                className="theme-thumbnail"
              />
            </div>
            <div className="theme-card-info">
              <h4>{theme.name}</h4>
            </div>
            {themeSelection === id && <div className="theme-card-badge">✓</div>}
          </button>
        ))}
        </div>
        <button 
          type="button" 
          className="theme-nav-btn theme-nav-right"
          onClick={() => scrollGallery(themeGalleryRef, 'right')}
          title="Scroll right"
        >
          ›
        </button>
      </div>

      {customPresetEntries.length > 0 && (
        <>
          <h3 className="custom-presets-heading">Custom Presets</h3>
          <div className="theme-gallery-container">
            <button 
              type="button" 
              className="theme-nav-btn theme-nav-left"
              onClick={() => scrollGallery(customGalleryRef, 'left')}
              title="Scroll left"
            >
              ‹
            </button>
            <div className="theme-gallery" ref={customGalleryRef}>
            {customPresetEntries.map(({ id, preset, preview }) => (
              <button
                key={id}
                type="button"
                className={`theme-card ${themeSelection === id ? 'active' : ''}`}
                onClick={() => handleThemeSelect(id)}
              >
                <div className="theme-preview">
                  <ThemePreview {...preview} />
                </div>
                <div className="theme-card-info">
                  <h4>{preset.name}</h4>
                </div>
                {themeSelection === id && <div className="theme-card-badge">✓</div>}
              </button>
            ))}
            </div>
            <button 
              type="button" 
              className="theme-nav-btn theme-nav-right"
              onClick={() => scrollGallery(customGalleryRef, 'right')}
              title="Scroll right"
            >
              ›
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemesTab;
