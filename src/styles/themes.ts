/**
 * Centralized UI theme configuration for the application.
 * This allows easy switching between light and dark modes.
 */

export interface UITheme {
  name: string;

  // Background colors
  editorBg: string;
  panelBg: string;
  toolbarBg: string;
  buttonBg: string;
  buttonBgHover: string;
  buttonBgActive: string;
  selectBg: string;
  selectBgHover: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textPlaceholder: string;

  // Border colors
  borderColor: string;
  borderColorHover: string;
  borderColorLight: string;

  // Accent colors
  accentPrimary: string;
  accentPrimaryHover: string;

  // Shadow colors
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;

  // CodeMirror specific
  cmContentBg: string;
  cmLineBg: string;
  cmCursor: string;
  cmSelection: string;
  cmGutterBg: string;
  cmGutterText: string;
  cmText: string;

  // Search panel
  searchPanelBg: string;
  searchPanelBorder: string;
  searchInputBg: string;
  searchInputBorder: string;
  searchInputBorderFocus: string;
  searchInputText: string;
  searchButtonBg: string;
  searchButtonBgHover: string;
  searchButtonText: string;
}

export const darkTheme: UITheme = {
  name: 'dark',

  // Background colors
  editorBg: '#0f172a',
  panelBg: 'rgba(20, 31, 52, 0.95)',
  toolbarBg: 'linear-gradient(180deg, rgba(20, 31, 52, 0.95), rgba(12, 20, 36, 0.9))',
  buttonBg: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.95), rgba(20, 31, 52, 0.95))',
  buttonBgHover: 'linear-gradient(to bottom, rgba(40, 51, 69, 0.98), rgba(30, 41, 59, 0.95))',
  buttonBgActive: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(12, 20, 36, 0.9))',
  selectBg: 'rgba(30, 41, 59, 0.95)',
  selectBgHover: 'rgba(40, 51, 69, 0.98)',

  // Text colors
  textPrimary: '#e2e8f0',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',
  textPlaceholder: '#64748b',

  // Border colors
  borderColor: 'rgba(148, 163, 184, 0.3)',
  borderColorHover: 'rgba(148, 163, 184, 0.5)',
  borderColorLight: 'rgba(148, 163, 184, 0.18)',

  // Accent colors
  accentPrimary: '#3b82f6',
  accentPrimaryHover: '#2563eb',

  // Shadow colors
  shadowSm: '0 1px 2px rgba(3, 7, 18, 0.55)',
  shadowMd: '0 6px 14px -6px rgba(15, 23, 42, 0.7)',
  shadowLg: '0 18px 32px -12px rgba(3, 7, 18, 0.75)',

  // CodeMirror specific
  cmContentBg: 'transparent',
  cmLineBg: 'transparent',
  cmCursor: '#3b82f6',
  cmSelection: 'rgba(59, 130, 246, 0.25)',
  cmGutterBg: 'rgba(15, 23, 42, 0.5)',
  cmGutterText: '#64748b',
  cmText: '#e2e8f0',

  // Search panel
  searchPanelBg: 'rgba(20, 31, 52, 0.98)',
  searchPanelBorder: 'rgba(148, 163, 184, 0.3)',
  searchInputBg: 'rgba(30, 41, 59, 0.95)',
  searchInputBorder: 'rgba(148, 163, 184, 0.3)',
  searchInputBorderFocus: 'rgba(59, 130, 246, 0.5)',
  searchInputText: '#e2e8f0',
  searchButtonBg: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.95), rgba(20, 31, 52, 0.95))',
  searchButtonBgHover: 'linear-gradient(to bottom, rgba(40, 51, 69, 0.98), rgba(30, 41, 59, 0.95))',
  searchButtonText: '#cbd5e1',
};

export const lightTheme: UITheme = {
  name: 'light',

  // Background colors
  editorBg: '#ffffff',
  panelBg: '#fafafa',
  toolbarBg: 'linear-gradient(to bottom, #fafafa, #f5f5f5)',
  buttonBg: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
  buttonBgHover: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
  buttonBgActive: 'linear-gradient(to bottom, #f1f5f9, #e2e8f0)',
  selectBg: '#ffffff',
  selectBgHover: '#f8fafc',

  // Text colors
  textPrimary: '#1f2937',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  textPlaceholder: '#9ca3af',

  // Border colors
  borderColor: '#cbd5e1',
  borderColorHover: '#94a3b8',
  borderColorLight: '#e2e8f0',

  // Accent colors
  accentPrimary: '#3b82f6',
  accentPrimaryHover: '#2563eb',

  // Shadow colors
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 6px 14px -6px rgba(0, 0, 0, 0.15)',
  shadowLg: '0 18px 32px -12px rgba(0, 0, 0, 0.25)',

  // CodeMirror specific
  cmContentBg: 'transparent',
  cmLineBg: 'transparent',
  cmCursor: '#007acc',
  cmSelection: 'rgba(0, 122, 204, 0.15)',
  cmGutterBg: '#f5f5f5',
  cmGutterText: '#64748b',
  cmText: '#1f2937',

  // Search panel
  searchPanelBg: '#ffffff',
  searchPanelBorder: '#cbd5e1',
  searchInputBg: '#ffffff',
  searchInputBorder: '#cbd5e1',
  searchInputBorderFocus: '#64748b',
  searchInputText: '#1f2937',
  searchButtonBg: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
  searchButtonBgHover: 'linear-gradient(to bottom, #e2e8f0, #cbd5e1)',
  searchButtonText: '#475569',
};

// Default theme (currently dark mode)
export const currentTheme: UITheme = darkTheme;

/**
 * Apply theme to CSS variables
 */
export function applyTheme(theme: UITheme) {
  const root = document.documentElement;

  // Background colors
  root.style.setProperty('--editor-bg', theme.editorBg);
  root.style.setProperty('--panel-bg', theme.panelBg);
  root.style.setProperty('--toolbar-bg', theme.toolbarBg);
  root.style.setProperty('--button-bg', theme.buttonBg);
  root.style.setProperty('--button-bg-hover', theme.buttonBgHover);
  root.style.setProperty('--button-bg-active', theme.buttonBgActive);
  root.style.setProperty('--select-bg', theme.selectBg);
  root.style.setProperty('--select-bg-hover', theme.selectBgHover);

  // Text colors
  root.style.setProperty('--text-primary', theme.textPrimary);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--text-tertiary', theme.textTertiary);
  root.style.setProperty('--text-placeholder', theme.textPlaceholder);

  // Border colors
  root.style.setProperty('--border-color', theme.borderColor);
  root.style.setProperty('--border-color-hover', theme.borderColorHover);
  root.style.setProperty('--border-color-light', theme.borderColorLight);

  // Accent colors
  root.style.setProperty('--accent-primary', theme.accentPrimary);
  root.style.setProperty('--accent-primary-hover', theme.accentPrimaryHover);

  // Shadows
  root.style.setProperty('--shadow-sm', theme.shadowSm);
  root.style.setProperty('--shadow-md', theme.shadowMd);
  root.style.setProperty('--shadow-lg', theme.shadowLg);

  // CodeMirror
  root.style.setProperty('--cm-content-bg', theme.cmContentBg);
  root.style.setProperty('--cm-line-bg', theme.cmLineBg);
  root.style.setProperty('--cm-cursor', theme.cmCursor);
  root.style.setProperty('--cm-selection', theme.cmSelection);
  root.style.setProperty('--cm-gutter-bg', theme.cmGutterBg);
  root.style.setProperty('--cm-gutter-text', theme.cmGutterText);
  root.style.setProperty('--cm-text', theme.cmText);

  // Search panel
  root.style.setProperty('--search-panel-bg', theme.searchPanelBg);
  root.style.setProperty('--search-panel-border', theme.searchPanelBorder);
  root.style.setProperty('--search-input-bg', theme.searchInputBg);
  root.style.setProperty('--search-input-border', theme.searchInputBorder);
  root.style.setProperty('--search-input-border-focus', theme.searchInputBorderFocus);
  root.style.setProperty('--search-input-text', theme.searchInputText);
  root.style.setProperty('--search-button-bg', theme.searchButtonBg);
  root.style.setProperty('--search-button-bg-hover', theme.searchButtonBgHover);
  root.style.setProperty('--search-button-text', theme.searchButtonText);
}
