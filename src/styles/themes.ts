/**
 * Centralized UI theme configuration for the shell (editor + chrome).
 * Themes are defined as CSS variable maps so styling stays consistent.
 */

export type UIThemeId = 'dark' | 'light';

export interface UITheme {
  id: UIThemeId;
  label: string;
  colorScheme: 'dark' | 'light';
  vars: Record<string, string>;
}

const PRIMARY = '#283746';
const PRIMARY_HOVER = '#32475b';
const PRIMARY_ACTIVE = '#1f2b36';

const darkTheme: UITheme = {
  id: 'dark',
  label: 'Midnight',
  colorScheme: 'dark',
  vars: {
    '--primary-color': PRIMARY,
    '--primary-hover': PRIMARY_HOVER,
    '--primary-active': PRIMARY_ACTIVE,
    '--accent-color': '#4d9ac7',
    '--accent-primary': PRIMARY,
    '--accent-primary-hover': PRIMARY_HOVER,

    '--text-on-primary': '#f5f7fa',
    '--text-color': '#f4f6f8',
    '--text-primary': '#f4f6f8',
    '--text-secondary': '#c5d0dc',
    '--text-tertiary': '#9aa7b6',
    '--text-muted': '#8895a3',
    '--text-placeholder': '#7a8796',

    '--background-color': '#0e161f',
    '--app-background': '#0e161f',
    '--panel-bg': 'rgba(22, 32, 43, 0.95)',
    '--panel-elevated-bg': 'rgba(28, 40, 52, 0.98)',
    '--toolbar-bg': 'linear-gradient(180deg, rgba(28, 40, 52, 0.96), rgba(14, 22, 30, 0.92))',
    '--hover-bg': 'rgba(40, 55, 70, 0.35)',
    '--active-bg': 'rgba(40, 55, 70, 0.5)',
    '--editor-bg': '#111a24',
    '--preview-bg': '#0b121a',

    '--button-bg': 'linear-gradient(180deg, rgba(32, 45, 58, 0.95), rgba(22, 32, 43, 0.95))',
    '--button-bg-hover': 'linear-gradient(180deg, rgba(40, 55, 70, 0.98), rgba(28, 40, 52, 0.96))',
    '--button-bg-active': 'linear-gradient(180deg, rgba(18, 27, 36, 0.95), rgba(14, 22, 30, 0.92))',
    '--select-bg': 'rgba(28, 40, 52, 0.96)',
    '--select-bg-hover': 'rgba(40, 55, 70, 0.98)',
    '--toolbar-primary-bg': '#3590F3',
    '--toolbar-primary-hover': '#2a75d1',
    '--toolbar-primary-active': '#1e5bb0',
    '--toolbar-primary-border': '#1e5bb0',
    '--toolbar-primary-text': '#F7F0F0',
    '--toolbar-primary-shadow': 'rgba(53, 144, 243, 0.45)',
    '--toolbar-secondary-bg': '#558B6E',
    '--toolbar-secondary-hover': '#467059',
    '--toolbar-secondary-active': '#395744',
    '--toolbar-secondary-border': '#2d4a34',
    '--toolbar-secondary-text': '#F7F0F0',
    '--toolbar-secondary-shadow': 'rgba(85, 139, 110, 0.4)',
    '--toolbar-locked-bg': 'rgba(32, 45, 58, 0.6)',
    '--toolbar-locked-border': 'var(--border-color)',
    '--toolbar-locked-text': 'var(--text-muted)',
    '--toolbar-locked-shadow': 'none',

    '--border-color': 'rgba(89, 109, 129, 0.32)',
    '--border-hover': 'rgba(122, 142, 162, 0.45)',
    '--border-color-hover': 'rgba(122, 142, 162, 0.45)',
    '--border-color-light': 'rgba(80, 98, 116, 0.18)',
    '--border-color-separator': 'rgba(55, 70, 86, 0.6)',
    '--panel-border-strong': 'rgba(122, 142, 162, 0.6)',

    '--shadow-sm': '0 1px 2px rgba(3, 7, 12, 0.55)',
    '--shadow-md': '0 8px 20px -8px rgba(7, 12, 18, 0.7)',
    '--shadow-lg': '0 20px 42px -18px rgba(3, 7, 14, 0.75)',
    '--shadow-xl': '0 40px 70px -22px rgba(0, 4, 10, 0.8)',

    '--error-color': '#f87171',
    '--error-color-hover': '#ff6b6b',
    '--error-color-active': '#d94646',
    '--error-bg': 'rgba(248, 113, 113, 0.12)',
    '--warning-color': '#fbbf24',
    '--warning-color-strong': '#facc15',
    '--warning-bg': 'rgba(251, 191, 36, 0.14)',
    '--success-color': '#34d399',
    '--success-color-hover': '#40d7a6',
    '--success-color-active': '#2da887',
    '--success-bg': 'rgba(52, 211, 153, 0.14)',
    '--info-color': '#38bdf8',
    '--info-color-strong': '#5ac3ff',
    '--info-bg': 'rgba(56, 189, 248, 0.14)',

    '--cm-content-bg': 'transparent',
    '--cm-line-bg': 'transparent',
    '--cm-cursor': '#4d9ac7',
    '--cm-selection': 'rgba(77, 154, 199, 0.3)',
    '--cm-gutter-bg': 'rgba(17, 27, 36, 0.65)',
    '--cm-gutter-text': '#748394',
    '--cm-text': '#f4f6f8',
    '--cm-heading-color': '#60a5fa',
    '--cm-strong-color': '#f4f6f8',
    '--cm-link-color': '#60a5fa',
    '--cm-url-color': '#a78bfa',
    '--cm-code-color': '#fbbf24',
    '--cm-quote-color': '#cbd5e1',
    '--cm-punctuation-color': '#60a5fa',

    '--search-panel-bg': 'rgba(18, 27, 36, 0.96)',
    '--search-panel-border': 'rgba(89, 109, 129, 0.32)',
    '--search-input-bg': 'rgba(28, 40, 52, 0.96)',
    '--search-input-border': 'rgba(89, 109, 129, 0.32)',
    '--search-input-border-focus': 'rgba(77, 154, 199, 0.55)',
    '--search-input-text': '#f4f6f8',
    '--search-button-bg': 'linear-gradient(180deg, rgba(32, 45, 58, 0.95), rgba(22, 32, 43, 0.95))',
    '--search-button-bg-hover': 'linear-gradient(180deg, rgba(40, 55, 70, 0.98), rgba(28, 40, 52, 0.96))',
    '--search-button-text': '#d4dbe5',

    '--bg-white': 'var(--panel-bg)',
    '--bg-light': 'rgba(24, 34, 45, 0.94)',
    '--bg-lighter': 'rgba(20, 30, 41, 0.92)',
    '--bg-lightest': 'rgba(16, 24, 33, 0.9)',
    '--bg-gradient-light': 'linear-gradient(180deg, rgba(28, 40, 52, 0.96), rgba(18, 27, 36, 0.92))',

    '--ripple-color': 'rgba(77, 154, 199, 0.25)',
    '--focus-ring': 'rgba(77, 154, 199, 0.45)',
    '--button-glow-primary': 'rgba(77, 154, 199, 0.45)',
    '--link-color': '#4d9ac7',
    '--link-hover-color': '#6bb7dd',
    '--typing-indicator-gradient': 'linear-gradient(135deg, #4d9ac7, #7ab9d9)',
    '--muted-surface': 'rgba(32, 45, 58, 0.6)',
  },
};

const lightTheme: UITheme = {
  id: 'light',
  label: 'Daybreak',
  colorScheme: 'light',
  vars: {
    '--primary-color': '#0066cc',
    '--primary-hover': '#0052a3',
    '--primary-active': '#003d7a',
    '--accent-color': '#2a9d8f',
    '--accent-primary': PRIMARY,
    '--accent-primary-hover': PRIMARY_HOVER,

    '--text-on-primary': '#ffffff',
    '--text-color': '#1f2937',
    '--text-primary': '#1f2937',
    '--text-secondary': '#475569',
    '--text-tertiary': '#64748b',
    '--text-muted': '#9ca3af',
    '--text-placeholder': '#9ca3af',

    '--background-color': '#f8fafc',
    '--app-background': '#f8fafc',
    '--panel-bg': '#ffffff',
    '--panel-elevated-bg': '#ffffff',
    '--toolbar-bg': 'linear-gradient(to bottom, #fefefe, #f9f9f9)',
    '--hover-bg': '#f1f5f9',
    '--active-bg': '#e5e7eb',
    '--editor-bg': '#fefefe',
    '--preview-bg': '#f8fafc',

    '--button-bg': '#ffffff',
    '--button-bg-hover': '#f1f5f9',
    '--button-bg-active': '#e5e7eb',
    '--select-bg': '#ffffff',
    '--select-bg-hover': '#f1f5f9',
    '--toolbar-primary-bg': '#3590F3',
    '--toolbar-primary-hover': '#2a75d1',
    '--toolbar-primary-active': '#1e5bb0',
    '--toolbar-primary-border': '#1e5bb0',
    '--toolbar-primary-text': '#F7F0F0',
    '--toolbar-primary-shadow': 'rgba(53, 144, 243, 0.35)',
    '--toolbar-secondary-bg': '#558B6E',
    '--toolbar-secondary-hover': '#467059',
    '--toolbar-secondary-active': '#395744',
    '--toolbar-secondary-border': '#2d4a34',
    '--toolbar-secondary-text': '#F7F0F0',
    '--toolbar-secondary-shadow': 'rgba(85, 139, 110, 0.3)',
    '--toolbar-locked-bg': '#edf2f7',
    '--toolbar-locked-border': '#cbd5e1',
    '--toolbar-locked-text': '#64748b',
    '--toolbar-locked-shadow': 'none',

    '--border-color': '#e2e8f0',
    '--border-hover': '#cbd5e1',
    '--border-color-hover': '#cbd5e1',
    '--border-color-light': '#e2e8f0',
    '--border-color-separator': '#e2e8f0',
    '--panel-border-strong': '#cbd5e1',

    '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',

    '--error-color': '#dc2626',
    '--error-color-hover': '#b91c1c',
    '--error-color-active': '#991b1b',
    '--error-bg': '#fef2f2',
    '--warning-color': '#d97706',
    '--warning-color-strong': '#fbbf24',
    '--warning-bg': '#fffbeb',
    '--success-color': '#10b981',
    '--success-color-hover': '#0ea472',
    '--success-color-active': '#0b8158',
    '--success-bg': '#ecfdf5',
    '--info-color': '#3b82f6',
    '--info-color-strong': '#2563eb',
    '--info-bg': '#eff6ff',

    '--cm-content-bg': 'transparent',
    '--cm-line-bg': 'transparent',
    '--cm-cursor': '#007acc',
    '--cm-selection': 'rgba(0, 122, 204, 0.1)',
    '--cm-gutter-bg': '#f8fafc',
    '--cm-gutter-text': '#94a3b8',
    '--cm-text': '#1f2937',
    '--cm-heading-color': '#1f2937',
    '--cm-strong-color': '#1f2937',
    '--cm-link-color': '#2563eb',
    '--cm-url-color': '#1d4ed8',
    '--cm-code-color': '#d97706',
    '--cm-quote-color': '#475569',
    '--cm-punctuation-color': '#475569',

    '--search-panel-bg': '#ffffff',
    '--search-panel-border': '#e2e8f0',
    '--search-input-bg': '#ffffff',
    '--search-input-border': '#e2e8f0',
    '--search-input-border-focus': '#94a3b8',
    '--search-input-text': '#1f2937',
    '--search-button-bg': 'linear-gradient(180deg, #ffffff, #f1f5f9)',
    '--search-button-bg-hover': 'linear-gradient(180deg, #f1f5f9, #e5e7eb)',
    '--search-button-text': '#1f2937',

    '--bg-white': '#ffffff',
    '--bg-light': '#f8fafc',
    '--bg-lighter': '#f1f5f9',
    '--bg-lightest': '#e2e8f0',
    '--bg-gradient-light': 'linear-gradient(180deg, #ffffff, #f1f5f9)',

    '--ripple-color': 'rgba(0, 102, 204, 0.15)',
    '--focus-ring': 'rgba(0, 102, 204, 0.2)',
    '--button-glow-primary': 'rgba(53, 144, 243, 0.3)',
    '--link-color': '#2563eb',
    '--link-hover-color': '#1d4ed8',
    '--typing-indicator-gradient': 'linear-gradient(135deg, #2563eb, #60a5fa)',
    '--muted-surface': '#edf2f7',
  },
};

export const uiThemes: Record<UIThemeId, UITheme> = {
  dark: darkTheme,
  light: lightTheme,
};

export function applyTheme(theme: UITheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.uiTheme = theme.id;
  root.style.setProperty('color-scheme', theme.colorScheme);

  for (const [cssVar, value] of Object.entries(theme.vars)) {
    root.style.setProperty(cssVar, value);
  }
}
