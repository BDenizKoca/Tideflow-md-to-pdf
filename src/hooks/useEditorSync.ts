/**
 * Hook to handle editor-to-PDF scroll synchronization.
 * Computes the active anchor based on the editor viewport and manages sync modes.
 */

import { useCallback, useEffect } from 'react';
import type { SourceAnchor, SourceMap, SyncMode } from '../types';
import { TIMING, ANCHOR } from '../constants/timing';
import type { EditorStateRefs } from './useEditorState';
import { logger } from '../utils/logger';

const useEditorSyncLogger = logger.createScoped('useEditorSync');

interface UseEditorSyncParams {
  editorStateRefs: EditorStateRefs;
  currentFile: string | null;
  sourceMap: SourceMap | null;
  setSyncMode: (mode: SyncMode) => void;
  setActiveAnchorId: (id: string | null) => void;
  setEditorScrollPosition: (file: string, position: number) => void;
}

export function useEditorSync(params: UseEditorSyncParams) {
  const {
    editorStateRefs,
    currentFile,
    sourceMap,
    setSyncMode,
    setActiveAnchorId,
    setEditorScrollPosition,
  } = params;

  const {
    editorViewRef,
    scrollElRef,
    programmaticScrollRef,
    sourceMapRef,
    activeAnchorIdRef,
    syncModeRef,
    isUserTypingRef,
    isTypingStoreRef,
    anchorUpdateFromEditorRef,
    scrollIdleTimeoutRef,
    initialSourceMapSet,
  } = editorStateRefs;

  const computeAnchorFromViewport = useCallback((userInitiated = false) => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl) return;
    if (programmaticScrollRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        useEditorSyncLogger.debug('skipping anchor compute - programmatic scroll in progress');
      }
      return;
    }
    if (isUserTypingRef.current || isTypingStoreRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        useEditorSyncLogger.debug('skipping anchor compute - user is typing');
      }
      return;
    }
    const map = sourceMapRef.current;
    if (!map || map.anchors.length === 0) return;

    const top = scrollEl.scrollTop;
    const bottom = top + scrollEl.clientHeight;
    const topBlock = editorViewRef.current!.lineBlockAtHeight(Math.max(0, top));
    const bottomHeight = Math.max(0, Math.min(scrollEl.scrollHeight - 1, bottom));
    const bottomBlock = editorViewRef.current!.lineBlockAtHeight(bottomHeight);
    const topLine = Math.max(0, editorViewRef.current!.state.doc.lineAt(topBlock.from).number - 1);
    const bottomLine = Math.max(0, editorViewRef.current!.state.doc.lineAt(bottomBlock.to).number - 1);
    const centerLine = Math.max(0, Math.floor((topLine + bottomLine) / 2));

    // Improved anchor selection: prefer anchors in/just after viewport, avoid far anchors
    let closest: SourceAnchor | null = null;
    let closestScore = Number.POSITIVE_INFINITY;

    // First pass: try to find anchor in or near viewport
    for (const anchor of map.anchors) {
      const isInViewport = anchor.editor.line >= topLine && anchor.editor.line <= bottomLine;
      const isJustAfter = anchor.editor.line > bottomLine && anchor.editor.line <= bottomLine + ANCHOR.NEARBY_SEARCH_WINDOW;
      const isJustBefore = anchor.editor.line < topLine && anchor.editor.line >= topLine - ANCHOR.NEARBY_SEARCH_WINDOW;

      if (isInViewport || isJustAfter || isJustBefore) {
        const diff = Math.abs(anchor.editor.line - centerLine);
        let score = diff;

        // Slight preference for anchors in viewport vs just outside
        if (!isInViewport) {
          score = diff + ANCHOR.NEARBY_SCORE_PENALTY;
        }

        if (score < closestScore) {
          closest = anchor;
          closestScore = score;
        }
      }
    }

    // If no nearby anchor found, use simple closest by absolute distance
    if (!closest) {
      for (const anchor of map.anchors) {
        const diff = Math.abs(anchor.editor.line - centerLine);
        if (diff < closestScore) {
          closest = anchor;
          closestScore = diff;
        }
      }
    }

    if (!closest) return;

    if (process.env.NODE_ENV !== 'production') {
      useEditorSyncLogger.debug('computed closest anchor', { id: closest.id, line: closest.editor.line, centerLine });
      useEditorSyncLogger.debug('syncModeRef, activeAnchorIdRef', { syncMode: syncModeRef.current, activeAnchor: activeAnchorIdRef.current });
    }

    // Only release the preview lock when the editor scroll was
    // explicitly user-initiated (not on initial compute or programmatic
    // calls). This prevents the preview from unlocking immediately when
    // the editor initializes or when we programmatically set scroll/anchor.
    if (userInitiated && syncModeRef.current === 'locked-to-pdf') {
      setSyncMode('auto');
    }

    // Persist the current manual scroll position per-file so reopening
    // the same file restores the user's manual view. Only persist when
    // this was a true user-initiated scroll (not programmatic).
    try {
      const curFile = currentFile;
      if (userInitiated && curFile) {
        const pos = scrollEl.scrollTop;
        setEditorScrollPosition(curFile, pos);
        if (process.env.NODE_ENV !== 'production') useEditorSyncLogger.debug('persisted scroll pos', { file: curFile, pos });
      }
    } catch { /* ignore persistence failures */ }

    if (closest.id !== activeAnchorIdRef.current) {
      anchorUpdateFromEditorRef.current = true;
      setActiveAnchorId(closest.id);
      if (process.env.NODE_ENV !== 'production') {
        useEditorSyncLogger.debug('setActiveAnchorId ->', closest.id);
      }
    }
  }, [
    setSyncMode,
    setActiveAnchorId,
    currentFile,
    setEditorScrollPosition,
    scrollElRef,
    programmaticScrollRef,
    isUserTypingRef,
    isTypingStoreRef,
    sourceMapRef,
    editorViewRef,
    activeAnchorIdRef,
    syncModeRef,
    anchorUpdateFromEditorRef,
  ]);

  // Sync sourceMapRef and trigger initial anchor compute when sourceMap is set
  useEffect(() => {
    sourceMapRef.current = sourceMap;
    if (sourceMap && !initialSourceMapSet.current) {
      initialSourceMapSet.current = true;
      computeAnchorFromViewport(false);
    }
  }, [sourceMap, computeAnchorFromViewport, sourceMapRef, initialSourceMapSet]);

  // Setup scroll listener with debounce
  const setupScrollListener = useCallback(() => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl) return () => {};

    const handleScroll = () => {
      // Skip if programmatic scroll or typing
      if (programmaticScrollRef.current || isUserTypingRef.current || isTypingStoreRef.current) {
        return;
      }

      if (scrollIdleTimeoutRef.current) {
        clearTimeout(scrollIdleTimeoutRef.current);
      }
      scrollIdleTimeoutRef.current = setTimeout(() => {
        computeAnchorFromViewport(true);
      }, TIMING.SCROLL_DEBOUNCE_MS);
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    // Initial compute is not user-initiated
    computeAnchorFromViewport(false);

    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [scrollElRef, scrollIdleTimeoutRef, computeAnchorFromViewport, programmaticScrollRef, isUserTypingRef, isTypingStoreRef]);

  return {
    computeAnchorFromViewport,
    setupScrollListener,
  };
}

