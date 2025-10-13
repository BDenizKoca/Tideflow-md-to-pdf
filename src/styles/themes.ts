/**
 * Theme management - handles switching between dark and light themes
 * All theme colors are defined in themes.css
 * This file only manages the theme switching logic
 */

export type UIThemeId = 'dark' | 'light';

export interface UITheme {
  id: UIThemeId;
  label: string;
  colorScheme: 'dark' | 'light';
}

export const uiThemes: Record<UIThemeId, UITheme> = {
  dark: {
    id: 'dark',
    label: 'Midnight',
    colorScheme: 'dark',
  },
  light: {
    id: 'light',
    label: 'Daybreak',
    colorScheme: 'light',
  },
};

/**
 * Apply a theme by setting the data-ui-theme attribute and color-scheme
 * All colors are managed via CSS in themes.css
 */
export function applyTheme(theme: UITheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.uiTheme = theme.id;
  root.style.setProperty('color-scheme', theme.colorScheme);
}
