import { create } from 'zustand';
import type { CompileStatus, EditorState, SourceMap, SyncMode } from '../types';

// Initial editor state
const initialEditorState: EditorState = {
  currentFile: null,
  openFiles: [],
  content: '',
  modified: false,
  compileStatus: {
    status: 'idle',
  },
};

// Editor-specific store state
interface EditorStoreState {
  // Editor state
  editor: EditorState;
  setCurrentFile: (path: string | null) => void;
  setContent: (content: string) => void;
  setModified: (modified: boolean) => void;
  setCompileStatus: (status: CompileStatus) => void;

  // Tab management
  addOpenFile: (path: string) => void;
  removeOpenFile: (path: string) => void;
  closeAllFiles: () => void;

  // Scroll / cursor sync
  sourceMap: SourceMap | null;
  setSourceMap: (map: SourceMap | null) => void;
  activeAnchorId: string | null;
  setActiveAnchorId: (id: string | null) => void;
  syncMode: SyncMode;
  setSyncMode: (mode: SyncMode) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  scrollLocked: boolean;
  setScrollLocked: (locked: boolean) => void;
  isTyping: boolean;
  setIsTyping: (v: boolean) => void;

  // Timestamp when the last compiled event arrived
  compiledAt: number;
  setCompiledAt: (ts: number) => void;

  // Persisted editor scroll positions per-file (in-memory)
  editorScrollPositions: Record<string, number>;
  setEditorScrollPosition: (path: string, pos: number) => void;
  getEditorScrollPosition: (path: string) => number | null;
}

// Create editor store
export const useEditorStore = create<EditorStoreState>((set, get) => ({
  // Editor state
  editor: initialEditorState,

  sourceMap: null,
  setSourceMap: (map: SourceMap | null) => set({ sourceMap: map }),

  activeAnchorId: null,
  setActiveAnchorId: (id: string | null) => set({ activeAnchorId: id }),

  syncMode: 'auto',
  setSyncMode: (mode: SyncMode) => set({ syncMode: mode }),

  syncEnabled: true,
  setSyncEnabled: (enabled: boolean) => set({ syncEnabled: enabled }),

  scrollLocked: false,
  setScrollLocked: (locked: boolean) => set({ scrollLocked: locked }),

  isTyping: false,
  setIsTyping: (v: boolean) => set({ isTyping: v }),

  compiledAt: 0,
  setCompiledAt: (ts: number) => set({ compiledAt: ts }),

  setCurrentFile: (path: string | null) => set((state) => ({
    editor: {
      ...state.editor,
      currentFile: path,
      modified: false,
    }
  })),

  setContent: (content: string) => set((state) => ({
    editor: {
      ...state.editor,
      content,
    }
  })),

  setModified: (modified: boolean) => set((state) => ({
    editor: {
      ...state.editor,
      modified,
    }
  })),

  setCompileStatus: (compileStatus: CompileStatus) => set((state) => ({
    editor: {
      ...state.editor,
      compileStatus,
    }
  })),

  // Tab management
  addOpenFile: (path: string) => set((state) => {
    if (state.editor.openFiles.includes(path)) {
      return { editor: state.editor };
    }

    return {
      editor: {
        ...state.editor,
        openFiles: [...state.editor.openFiles, path]
      }
    };
  }),

  removeOpenFile: (path: string) => set((state) => {
    const newOpenFiles = state.editor.openFiles.filter(f => f !== path);

    let newCurrentFile = state.editor.currentFile;
    let newContent = state.editor.content;
    let newModified = state.editor.modified;
    let newCompileStatus = state.editor.compileStatus;

    if (path === state.editor.currentFile) {
      newCurrentFile = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;

      if (newCurrentFile === null) {
        newContent = '';
        newModified = false;
        newCompileStatus = { status: 'idle' };
      }
    }

    return {
      editor: {
        ...state.editor,
        openFiles: newOpenFiles,
        currentFile: newCurrentFile,
        content: newContent,
        modified: newModified,
        compileStatus: newCompileStatus
      }
    };
  }),

  closeAllFiles: () => set(() => ({
    editor: {
      currentFile: null,
      openFiles: [],
      content: '',
      modified: false,
      compileStatus: { status: 'idle' }
    }
  })),

  // Editor scroll position persistence (in-memory map)
  editorScrollPositions: {},
  setEditorScrollPosition: (path: string, pos: number) => set((state) => ({
    editorScrollPositions: { ...state.editorScrollPositions, [path]: pos }
  })),
  getEditorScrollPosition: (path: string) => {
    const s = get();
    return s.editorScrollPositions[path] ?? null;
  },
}));
