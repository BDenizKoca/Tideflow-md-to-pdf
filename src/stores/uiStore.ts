import { create } from 'zustand';
import type { Toast } from '../types';
import type { TabSection } from '../components/DesignModal/types';
import { logger } from '../utils/logger';

const uiLogger = logger.createScoped('UIStore');

// UI-specific store state
interface UIStoreState {
  // Preview state
  previewVisible: boolean;
  setPreviewVisible: (visible: boolean) => void;

  // PDF controls
  pdfZoom: number;
  setPdfZoom: (zoom: number) => void;
  thumbnailsVisible: boolean;
  setThumbnailsVisible: (visible: boolean) => void;

  // Design modal
  designModalOpen: boolean;
  setDesignModalOpen: (open: boolean) => void;
  designModalActiveTab: TabSection | null;
  setDesignModalActiveTab: (tab: TabSection | null) => void;
  // Settings modal
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  settingsModalActiveTab: TabSection | null;
  setSettingsModalActiveTab: (tab: TabSection | null) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Sample injection guard
  initialSampleInjected: boolean;
  setInitialSampleInjected: (v: boolean) => void;

  // Recent files (persisted to localStorage)
  recentFiles: string[];
  addRecentFile: (path: string) => void;
  clearRecentFiles: () => void;
}

// Create UI store
export const useUIStore = create<UIStoreState>((set) => ({
  // Preview state
  previewVisible: true,
  setPreviewVisible: (visible: boolean) => set({ previewVisible: visible }),

  // PDF controls
  pdfZoom: 1.0,
  setPdfZoom: (zoom: number) => set({ pdfZoom: zoom }),

  thumbnailsVisible: false,
  setThumbnailsVisible: (visible: boolean) => set({ thumbnailsVisible: visible }),

  // Design modal
  designModalOpen: false,
  setDesignModalOpen: (open: boolean) => set({ designModalOpen: open }),
  designModalActiveTab: null,
  setDesignModalActiveTab: (tab: TabSection | null) => set({ designModalActiveTab: tab }),
  // Settings modal (separate from design modal)
  settingsModalOpen: false,
  setSettingsModalOpen: (open: boolean) => set({ settingsModalOpen: open }),
  settingsModalActiveTab: null,
  setSettingsModalActiveTab: (tab: TabSection | null) => set({ settingsModalActiveTab: tab }),

  // Toast notifications
  toasts: [],
  addToast: (toast: Omit<Toast, 'id'>) => set((state) => ({
    toasts: [
      ...state.toasts,
      {
        ...toast,
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    ],
  })),
  removeToast: (id: string) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // Sample injection guard
  initialSampleInjected: false,
  setInitialSampleInjected: (v: boolean) => set({ initialSampleInjected: v }),

  // Recent files (persisted to localStorage)
  recentFiles: (() => {
    try {
      const stored = localStorage.getItem('recentFiles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),

  addRecentFile: (path: string) => set((state) => {
    // Don't add sample.md or empty paths to recent files
    if (!path || path === 'sample.md') return state;

    // Remove if already exists, then add to front (max 10)
    const filtered = state.recentFiles.filter(f => f !== path);
    const newRecent = [path, ...filtered].slice(0, 10);

    // Persist to localStorage
    try {
      localStorage.setItem('recentFiles', JSON.stringify(newRecent));
    } catch (e) {
      uiLogger.warn('Failed to save recent files', e);
    }

    return { recentFiles: newRecent };
  }),

  clearRecentFiles: () => set(() => {
    try {
      localStorage.removeItem('recentFiles');
    } catch (e) {
      uiLogger.warn('Failed to clear recent files', e);
    }
    return { recentFiles: [] };
  }),
}));
