import { create } from 'zustand';
import type { CompileStatus, FileState, SourceMap, SyncMode } from '../types';

/**
 * Per-file state lives in `documents`, keyed by absolute path. Tab switches
 * just change `activeFile`; components read the current file's data via the
 * selectors in useActiveDocument. There is no app-global "current content"
 * or "current source map" — those values are properties of a specific file.
 *
 * App-wide concerns that aren't naturally per-file (sync mode, typing flag,
 * etc.) stay top-level.
 */

function createInitialDocument(path: string, content: string): FileState {
  return {
    path,
    content,
    modified: false,
    compileStatus: { status: 'idle' },
    sourceMap: null,
    activeAnchorId: null,
    editorScrollPos: null,
    pdfScrollPos: null,
    editorState: null,
  };
}

interface EditorStoreState {
  // Per-file state, keyed by absolute path
  documents: Record<string, FileState>;
  // Tab order — display order in the tab bar
  openFiles: string[];
  // Which file is currently shown in the editor + preview, or null for none
  activeFile: string | null;

  // App-wide state (not per-file)
  syncMode: SyncMode;
  syncEnabled: boolean;
  scrollLocked: boolean;
  isTyping: boolean;
  compiledAt: number;

  // Document lifecycle
  /** Add a file to openFiles + create its FileState. Idempotent on path; if
   *  the path is already open, this refreshes its content (use case: user
   *  re-opens an existing file via Open File dialog). Does NOT change
   *  activeFile — call setActiveDocument separately. */
  openDocument: (path: string, content: string) => void;
  /** Remove a file from openFiles and drop its FileState. If it was active,
   *  activeFile shifts to the last remaining open file (or null). */
  closeDocument: (path: string) => void;
  /** Drop all documents and clear activeFile. */
  closeAllDocuments: () => void;
  /** Switch which file is active. Pass null to show no file. No-op if the
   *  given path isn't open. */
  setActiveDocument: (path: string | null) => void;
  /** Rename a file's path (used after Save As). Preserves all FileState. */
  renameDocument: (oldPath: string, newPath: string) => void;

  // Per-document mutations. Each takes a path so callers from async contexts
  // update the right document even if the user has switched tabs in the
  // meantime. Unknown paths are no-ops.
  updateDocumentContent: (path: string, content: string) => void;
  markDocumentModified: (path: string, modified: boolean) => void;
  setCompileStatus: (path: string, status: CompileStatus) => void;
  setSourceMap: (path: string, map: SourceMap | null) => void;
  setActiveAnchor: (path: string, id: string | null) => void;
  setDocumentEditorState: (path: string, state: unknown) => void;
  setDocumentEditorScroll: (path: string, pos: number | null) => void;
  setDocumentPdfScroll: (path: string, pos: number | null) => void;

  // App-wide setters
  setSyncMode: (mode: SyncMode) => void;
  setSyncEnabled: (v: boolean) => void;
  setScrollLocked: (v: boolean) => void;
  setIsTyping: (v: boolean) => void;
  setCompiledAt: (ts: number) => void;
}

/**
 * Helper: produce a new documents record with a single document partially
 * updated. Returns the original record unchanged if the path isn't open
 * (preserves zustand reference equality so subscribers don't re-render).
 */
function patchDocument(
  documents: Record<string, FileState>,
  path: string,
  patch: Partial<FileState>,
): Record<string, FileState> {
  const existing = documents[path];
  if (!existing) return documents;
  return { ...documents, [path]: { ...existing, ...patch } };
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  documents: {},
  openFiles: [],
  activeFile: null,

  syncMode: 'auto',
  syncEnabled: true,
  scrollLocked: false,
  isTyping: false,
  compiledAt: 0,

  openDocument: (path, content) => set((state) => {
    const existing = state.documents[path];
    const inOpenFiles = state.openFiles.includes(path);
    return {
      documents: {
        ...state.documents,
        [path]: existing
          // Re-opening: refresh content + clear modified, keep everything
          // else (preserves saved scroll, editor history if user briefly
          // closed and reopened mid-session, etc.). For most paths this is
          // first-time open and `existing` is undefined.
          ? { ...existing, content, modified: false }
          : createInitialDocument(path, content),
      },
      openFiles: inOpenFiles ? state.openFiles : [...state.openFiles, path],
    };
  }),

  closeDocument: (path) => set((state) => {
    if (!(path in state.documents) && !state.openFiles.includes(path)) {
      return state;
    }
    const newDocuments = { ...state.documents };
    delete newDocuments[path];
    const newOpenFiles = state.openFiles.filter((f) => f !== path);
    let newActiveFile = state.activeFile;
    if (state.activeFile === path) {
      newActiveFile = newOpenFiles.length > 0
        ? newOpenFiles[newOpenFiles.length - 1]
        : null;
    }
    return {
      documents: newDocuments,
      openFiles: newOpenFiles,
      activeFile: newActiveFile,
    };
  }),

  closeAllDocuments: () => set(() => ({
    documents: {},
    openFiles: [],
    activeFile: null,
  })),

  setActiveDocument: (path) => set((state) => {
    if (state.activeFile === path) return state;
    if (path !== null && !(path in state.documents)) return state;
    return { activeFile: path };
  }),

  renameDocument: (oldPath, newPath) => set((state) => {
    const doc = state.documents[oldPath];
    if (!doc) return state;
    const newDocuments = { ...state.documents };
    delete newDocuments[oldPath];
    newDocuments[newPath] = { ...doc, path: newPath };
    return {
      documents: newDocuments,
      openFiles: state.openFiles.map((f) => (f === oldPath ? newPath : f)),
      activeFile: state.activeFile === oldPath ? newPath : state.activeFile,
    };
  }),

  updateDocumentContent: (path, content) => set((state) => ({
    documents: patchDocument(state.documents, path, { content }),
  })),

  markDocumentModified: (path, modified) => set((state) => ({
    documents: patchDocument(state.documents, path, { modified }),
  })),

  setCompileStatus: (path, compileStatus) => set((state) => ({
    documents: patchDocument(state.documents, path, { compileStatus }),
  })),

  setSourceMap: (path, sourceMap) => set((state) => ({
    documents: patchDocument(state.documents, path, { sourceMap }),
  })),

  setActiveAnchor: (path, activeAnchorId) => set((state) => ({
    documents: patchDocument(state.documents, path, { activeAnchorId }),
  })),

  setDocumentEditorState: (path, editorState) => set((state) => ({
    documents: patchDocument(state.documents, path, { editorState }),
  })),

  setDocumentEditorScroll: (path, editorScrollPos) => set((state) => ({
    documents: patchDocument(state.documents, path, { editorScrollPos }),
  })),

  setDocumentPdfScroll: (path, pdfScrollPos) => set((state) => ({
    documents: patchDocument(state.documents, path, { pdfScrollPos }),
  })),

  setSyncMode: (syncMode) => set({ syncMode }),
  setSyncEnabled: (syncEnabled) => set({ syncEnabled }),
  setScrollLocked: (scrollLocked) => set({ scrollLocked }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setCompiledAt: (compiledAt) => set({ compiledAt }),
}));
