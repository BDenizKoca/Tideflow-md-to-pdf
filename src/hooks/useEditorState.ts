/**
 * Container for the editor's transient, app-global refs — the things one
 * persistent EditorView needs to coordinate with sync hooks (timeouts,
 * abort controllers, scroll guards, "is typing" flags). Per-file state
 * lives in the documents map in editorStore, not here.
 */

import { useRef, useEffect } from 'react';
import { EditorView } from 'codemirror';
import type { SourceMap, SyncMode } from '../types';

export interface EditorStateRefs {
  // Core editor refs
  editorRef: React.RefObject<HTMLDivElement | null>;
  editorViewRef: React.MutableRefObject<EditorView | null>;

  // Timeout / abort refs (transient, app-global)
  contentChangeTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  contentChangeAbortRef: React.MutableRefObject<AbortController | null>;
  typingDetectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  scrollIdleTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;

  // Scroll guards (transient — describe what's happening *right now*, not
  // a property of any specific file)
  scrollElRef: React.MutableRefObject<HTMLElement | null>;
  programmaticScrollRef: React.MutableRefObject<boolean>;
  programmaticUpdateRef: React.MutableRefObject<boolean>;
  anchorUpdateFromEditorRef: React.MutableRefObject<boolean>;

  // Mirrors of store state for stable access from imperative callbacks
  // that aren't React components (CodeMirror update listeners, scroll
  // handlers, etc.).
  sourceMapRef: React.MutableRefObject<SourceMap | null>;
  activeAnchorIdRef: React.MutableRefObject<string | null>;
  syncModeRef: React.MutableRefObject<SyncMode>;
  isUserTypingRef: React.MutableRefObject<boolean>;
  isTypingStoreRef: React.MutableRefObject<boolean>;

  // Tracker used by the file-switch effect to detect activeFile transitions.
  prevFileRef: React.MutableRefObject<string | null>;
  // Mirror of openFiles for callback access.
  openFilesRef: React.MutableRefObject<string[]>;

  // Render queue state (one queue, app-global — the api.ts queue collapses
  // intermediate updates so per-file queues would be redundant).
  autoRenderInFlightRef: React.MutableRefObject<boolean>;
  pendingRenderRef: React.MutableRefObject<string | null>;

  // Document swap function provided by useCodeMirrorSetup. Saves the
  // current EditorView state into the previous file's FileState (preserving
  // its cursor, selection, undo history) and loads the next file's stored
  // state — or a fresh state from its content, on first switch — into the
  // view. Null until the editor finishes initializing.
  swapDocumentRef: React.MutableRefObject<
    ((prevPath: string | null, nextPath: string | null) => void) | null
  >;
}

interface UseEditorStateParams {
  activeAnchorId: string | null;
  syncMode: SyncMode;
  isTyping: boolean;
  openFiles: string[];
}

export function useEditorState(params: UseEditorStateParams): EditorStateRefs {
  const { activeAnchorId, syncMode, isTyping, openFiles } = params;

  // Core editor refs
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Timeout refs
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentChangeAbortRef = useRef<AbortController | null>(null);
  const typingDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollIdleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll guards
  const scrollElRef = useRef<HTMLElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticUpdateRef = useRef(false);
  const anchorUpdateFromEditorRef = useRef(false);

  // Store mirrors
  const sourceMapRef = useRef<SourceMap | null>(null);
  const activeAnchorIdRef = useRef<string | null>(null);
  const syncModeRef = useRef<SyncMode>('auto');
  const isUserTypingRef = useRef(false);
  const isTypingStoreRef = useRef(isTyping);

  // File-switch tracking
  const prevFileRef = useRef<string | null>(null);
  const openFilesRef = useRef<string[]>([]);

  // Render queue
  const autoRenderInFlightRef = useRef(false);
  const pendingRenderRef = useRef<string | null>(null);

  // Provided by useCodeMirrorSetup once the EditorView is created.
  const swapDocumentRef = useRef<
    ((prevPath: string | null, nextPath: string | null) => void) | null
  >(null);

  // Auto-sync refs with props
  useEffect(() => {
    activeAnchorIdRef.current = activeAnchorId;
  }, [activeAnchorId]);

  useEffect(() => {
    syncModeRef.current = syncMode;
  }, [syncMode]);

  useEffect(() => {
    isTypingStoreRef.current = isTyping;
  }, [isTyping]);

  // Mirror openFiles for callback access. We no longer reset prevFileRef
  // when openFiles empties — the file-switch effect detects null activeFile
  // explicitly and the next openDocument creates a fresh FileState.
  useEffect(() => {
    openFilesRef.current = openFiles;
  }, [openFiles]);

  return {
    editorRef,
    editorViewRef,
    contentChangeTimeoutRef,
    contentChangeAbortRef,
    typingDetectionTimeoutRef,
    scrollIdleTimeoutRef,
    scrollElRef,
    programmaticScrollRef,
    programmaticUpdateRef,
    anchorUpdateFromEditorRef,
    sourceMapRef,
    activeAnchorIdRef,
    syncModeRef,
    isUserTypingRef,
    isTypingStoreRef,
    prevFileRef,
    openFilesRef,
    autoRenderInFlightRef,
    pendingRenderRef,
    swapDocumentRef,
  };
}
