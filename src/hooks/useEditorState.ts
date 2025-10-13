/**
 * Hook to consolidate all refs used in the Editor component.
 * Auto-syncs refs with props where needed.
 */

import { useRef, useEffect } from 'react';
import { EditorView } from 'codemirror';
import type { SourceMap, SyncMode } from '../types';

export interface EditorStateRefs {
  // Core editor refs
  editorRef: React.RefObject<HTMLDivElement | null>;
  editorViewRef: React.MutableRefObject<EditorView | null>;

  // Timeout refs
  contentChangeTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  contentChangeAbortRef: React.MutableRefObject<AbortController | null>;
  typingDetectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  scrollIdleTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;

  // Scroll and sync refs
  scrollElRef: React.MutableRefObject<HTMLElement | null>;
  programmaticScrollRef: React.MutableRefObject<boolean>;
  programmaticUpdateRef: React.MutableRefObject<boolean>;
  anchorUpdateFromEditorRef: React.MutableRefObject<boolean>;

  // State tracking refs (synced with props)
  sourceMapRef: React.MutableRefObject<SourceMap | null>;
  activeAnchorIdRef: React.MutableRefObject<string | null>;
  syncModeRef: React.MutableRefObject<SyncMode>;
  isUserTypingRef: React.MutableRefObject<boolean>;
  isTypingStoreRef: React.MutableRefObject<boolean>;

  // File management refs
  lastLoadedContentRef: React.MutableRefObject<string>;
  prevFileRef: React.MutableRefObject<string | null>;
  openFilesRef: React.MutableRefObject<string[]>;
  initialSourceMapSet: React.MutableRefObject<boolean>;

  // Render queue refs
  autoRenderInFlightRef: React.MutableRefObject<boolean>;
  pendingRenderRef: React.MutableRefObject<string | null>;

  // Generation tracking for remount
  generationRef: React.MutableRefObject<number>;
  hadNoFilesRef: React.MutableRefObject<boolean>;
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

  // Scroll and sync refs
  const scrollElRef = useRef<HTMLElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticUpdateRef = useRef(false);
  const anchorUpdateFromEditorRef = useRef(false);

  // State tracking refs
  const sourceMapRef = useRef<SourceMap | null>(null);
  const activeAnchorIdRef = useRef<string | null>(null);
  const syncModeRef = useRef<SyncMode>('auto');
  const isUserTypingRef = useRef(false);
  const isTypingStoreRef = useRef(isTyping);

  // File management refs
  const lastLoadedContentRef = useRef<string>('');
  const prevFileRef = useRef<string | null>(null);
  const openFilesRef = useRef<string[]>([]);
  const initialSourceMapSet = useRef(false);

  // Render queue refs
  const autoRenderInFlightRef = useRef(false);
  const pendingRenderRef = useRef<string | null>(null);

  // Generation tracking
  const generationRef = useRef(0);
  const hadNoFilesRef = useRef(false);

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

  // Track openFiles to detect transition to zero and reset refs
  useEffect(() => {
    openFilesRef.current = openFiles;
    if (openFiles.length === 0) {
      // Clear previous file reference so next opened file dispatches content
      prevFileRef.current = null;
    }
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
    lastLoadedContentRef,
    prevFileRef,
    openFilesRef,
    initialSourceMapSet,
    autoRenderInFlightRef,
    pendingRenderRef,
    generationRef,
    hadNoFilesRef,
  };
}
