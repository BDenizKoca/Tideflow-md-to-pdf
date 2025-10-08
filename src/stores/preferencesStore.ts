import { create } from 'zustand';
import type { Preferences } from '../types';
import { logger } from '../utils/logger';
import { EDITOR_CONSTANTS } from '../constants/editor';

const prefsLogger = logger.createScoped('PreferencesStore');

// Initial preferences
export const defaultPreferences: Preferences = {
  theme_id: 'default',
  papersize: 'a4',
  margin: {
    x: '2cm',
    y: '2.5cm',
  },
  toc: false,
  toc_title: '',
  toc_two_column: false,
  two_column_layout: false,
  cover_page: false,
  cover_title: '',
  cover_writer: '',
  cover_image: '',
  cover_image_width: '60%',
  number_sections: true,
  default_image_width: '80%',
  default_image_alignment: 'center',
  fonts: {
    main: 'Times New Roman',
    mono: 'Courier New',
  },
  font_size: 11,
  page_bg_color: '#ffffff',
  font_color: '#000000',
  heading_scale: 1.0,
  accent_color: '#1e40af',
  line_height: 1.5,
  paragraph_spacing: '0.65em',
  page_numbers: false,
  header_title: false,
  header_text: '',
  render_debounce_ms: EDITOR_CONSTANTS.RENDER_DEBOUNCE_MS,
  focused_preview_enabled: false,
  preserve_scroll_position: true,
  confirm_exit_on_unsaved: true,
};

// Preferences-specific store state
interface PreferencesStoreState {
  // Preferences state
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => void;
  
  // Theme selection & design
  themeSelection: string;
  setThemeSelection: (theme: string) => void;
  lastCustomPreferences: Preferences;
  
  // Custom presets (persisted to localStorage)
  customPresets: Record<string, { name: string; preferences: Preferences }>;
  saveCustomPreset: (id: string, name: string, preferences: Preferences) => void;
  deleteCustomPreset: (id: string) => void;
  renameCustomPreset: (id: string, newName: string) => void;
  
  // Cache management
  clearCache: () => void;
  resetState: () => void;
}

// Create preferences store
export const usePreferencesStore = create<PreferencesStoreState>((set) => ({
  // Preferences state
  preferences: defaultPreferences,
  setPreferences: (preferences: Preferences) => set((state) => {
    const snapshot: Preferences = {
      ...preferences,
      margin: { ...preferences.margin },
      fonts: { ...preferences.fonts },
    };
    return {
      preferences,
      lastCustomPreferences: state.themeSelection === 'custom' ? snapshot : state.lastCustomPreferences,
    };
  }),
  
  themeSelection: 'default',
  setThemeSelection: (theme: string) => set({ themeSelection: theme }),
  
  lastCustomPreferences: {
    ...defaultPreferences,
    margin: { ...defaultPreferences.margin },
    fonts: { ...defaultPreferences.fonts },
  },
  
  // Custom presets (persisted to localStorage)
  customPresets: (() => {
    try {
      const stored = localStorage.getItem('customPresets');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })() as Record<string, { name: string; preferences: Preferences }>,
  
  saveCustomPreset: (id: string, name: string, preferences: Preferences) => set((state) => {
    const newPresets = {
      ...state.customPresets,
      [id]: { name, preferences: { ...preferences, margin: { ...preferences.margin }, fonts: { ...preferences.fonts } } }
    };
    
    try {
      localStorage.setItem('customPresets', JSON.stringify(newPresets));
    } catch (e) {
      prefsLogger.warn('Failed to save custom preset', e);
    }
    
    return { customPresets: newPresets };
  }),
  
  deleteCustomPreset: (id: string) => set((state) => {
    const newPresets = { ...state.customPresets };
    delete newPresets[id];
    
    try {
      localStorage.setItem('customPresets', JSON.stringify(newPresets));
    } catch (e) {
      prefsLogger.warn('Failed to delete custom preset', e);
    }
    
    return { customPresets: newPresets };
  }),
  
  renameCustomPreset: (id: string, newName: string) => set((state) => {
    if (!state.customPresets[id]) return state;
    
    const newPresets = {
      ...state.customPresets,
      [id]: { ...state.customPresets[id], name: newName }
    };
    
    try {
      localStorage.setItem('customPresets', JSON.stringify(newPresets));
    } catch (e) {
      prefsLogger.warn('Failed to rename custom preset', e);
    }
    
    return { customPresets: newPresets };
  }),
  
  clearCache: () => set(() => ({
    preferences: defaultPreferences,
  })),
  
  resetState: () => set({
    preferences: defaultPreferences,
    themeSelection: 'default',
    lastCustomPreferences: {
      ...defaultPreferences,
      margin: { ...defaultPreferences.margin },
      fonts: { ...defaultPreferences.fonts },
    },
  }),
}));
