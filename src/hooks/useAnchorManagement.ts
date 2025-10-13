/**
 * Hook to handle anchor-related effects: activeAnchorId scrolling, anchor initialization.
 * Manages programmatic scrolling to anchors when PDF preview updates.
 */

import { useEffect, useRef } from 'react';
import { EditorView } from 'codemirror';
import type { SourceMap } from '../types';
import type { EditorStateRefs } from './useEditorState';

interface UseAnchorManagementParams {
  editorStateRefs: EditorStateRefs;
  sourceMap: SourceMap | null;
  activeAnchorId: string | null;
  setActiveAnchorId: (id: string | null) => void;
}

export function useAnchorManagement(params: UseAnchorManagementParams) {
  const {
    editorStateRefs,
    sourceMap,
    activeAnchorId,
    setActiveAnchorId,
  } = params;

  const {
    editorViewRef,
    anchorUpdateFromEditorRef,
    isTypingStoreRef,
    syncModeRef,
    programmaticScrollRef,
  } = editorStateRefs;

  // TWO-SOURCEMAP PATTERN: Keep reference to previous sourceMap to preserve position when IDs change
  // This allows us to look up the old anchor's line number and find the closest match in the new sourceMap
  // Works with any ID format (not dependent on parsing tf-LINE-N patterns)
  const prevSourceMapRef = useRef<SourceMap | null>(null);

  // Track last time typing stopped to prevent immediate scrolls after typing
  const lastTypingStoppedRef = useRef<number>(0);
  const lastIsTyping = useRef(isTypingStoreRef.current);

  // Track last scroll time to prevent rapid consecutive scrolls
  const lastScrollTimeRef = useRef<number>(0);

  // Detect when typing stops
  useEffect(() => {
    const currentIsTyping = isTypingStoreRef.current;
    if (lastIsTyping.current && !currentIsTyping) {
      // Just stopped typing
      lastTypingStoppedRef.current = Date.now();
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[useAnchorManagement] typing stopped, starting stabilization period');
      }
    }
    lastIsTyping.current = currentIsTyping;
  }, [isTypingStoreRef, activeAnchorId]); // Re-check when activeAnchorId changes

  // Scroll editor to active anchor when PDF preview updates it
  useEffect(() => {
    if (!editorViewRef.current) return;
    if (!sourceMap) return;
    if (!activeAnchorId) return;
    if (anchorUpdateFromEditorRef.current) {
      anchorUpdateFromEditorRef.current = false;
      return;
    }
    if (isTypingStoreRef.current) return;

    // CRITICAL: Prevent scrolls for a period after typing stops to avoid jumps
    const now = Date.now();
    const timeSinceTypingStopped = now - lastTypingStoppedRef.current;
    if (timeSinceTypingStopped < 1500) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[useAnchorManagement] skipping scroll - within typing stabilization period', {
          timeSinceTypingStopped,
          activeAnchorId
        });
      }
      return;
    }

    // Prevent rapid consecutive scrolls (minimum 300ms between scrolls)
    const timeSinceLastScroll = now - lastScrollTimeRef.current;
    if (timeSinceLastScroll < 300) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[useAnchorManagement] skipping scroll - too soon after last scroll', {
          timeSinceLastScroll
        });
      }
      return;
    }

    // Scroll editor in 'locked-to-pdf', 'two-way' modes, OR when explicitly set from PDF click
    // We allow auto mode here because click-to-sync is an explicit user action
    const allowedModes = ['locked-to-pdf', 'two-way', 'auto'];
    if (!allowedModes.includes(syncModeRef.current)) return;

    const anchor = sourceMap.anchors.find((candidate) => candidate.id === activeAnchorId);
    if (!anchor) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useAnchorManagement] anchor not found in sourceMap', { activeAnchorId });
      }
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[useAnchorManagement] scrolling editor to anchor', {
        activeAnchorId,
        offset: anchor.editor.offset,
        line: anchor.editor.line,
        syncMode: syncModeRef.current
      });
    }

    const view = editorViewRef.current;
    programmaticScrollRef.current = true;
    lastScrollTimeRef.current = Date.now();

    // Use scrollIntoView with double RAF to prevent jarring jumps
    const effect = EditorView.scrollIntoView(anchor.editor.offset, { y: 'center' });
    view.dispatch({ effects: effect });

    // Clear programmatic flag after animation completes (double RAF for smoother transition)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    });
  }, [
    activeAnchorId,
    sourceMap,
    editorViewRef,
    anchorUpdateFromEditorRef,
    isTypingStoreRef,
    syncModeRef,
    programmaticScrollRef,
  ]);

  // Initialize active anchor when sourceMap first loads or changes
  useEffect(() => {
    const anchors = sourceMap?.anchors ?? [];
    const prevSourceMap = prevSourceMapRef.current;

    // Update ref for next render
    prevSourceMapRef.current = sourceMap;

    if (anchors.length === 0) {
      if (activeAnchorId !== null) {
        setActiveAnchorId(null);
      }
      return;
    }

    // If current activeAnchorId exists in new anchors, keep it
    if (activeAnchorId && anchors.some((anchor) => anchor.id === activeAnchorId)) {
      return;
    }

    // activeAnchorId doesn't exist in new sourceMap (IDs changed after re-render)
    // Use previous sourceMap to find the old anchor's line number
    if (activeAnchorId && prevSourceMap) {
      const oldAnchor = prevSourceMap.anchors.find(a => a.id === activeAnchorId);

      if (oldAnchor) {
        // Find closest anchor in new map by line number
        let closest = anchors[0];
        let minDiff = Math.abs(anchors[0].editor.line - oldAnchor.editor.line);

        for (const anchor of anchors) {
          const diff = Math.abs(anchor.editor.line - oldAnchor.editor.line);
          if (diff < minDiff) {
            minDiff = diff;
            closest = anchor;
          }
        }

        if (process.env.NODE_ENV !== 'production') {
          console.debug('[useAnchorManagement] anchor ID changed, preserving position', {
            oldId: activeAnchorId,
            oldLine: oldAnchor.editor.line,
            newId: closest.id,
            newLine: closest.editor.line,
            diff: minDiff
          });
        }

        anchorUpdateFromEditorRef.current = true;
        setActiveAnchorId(closest.id);
        return;
      }
    }

    // activeAnchorId exists but no previous sourceMap or anchor not found
    // Don't reset - let editor sync handle it naturally
    if (activeAnchorId) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[useAnchorManagement] keeping activeAnchorId - let editor sync update', {
          activeAnchorId,
          hasPrevSourceMap: !!prevSourceMap
        });
      }
      return;
    }

    // Fallback: use first anchor (only on true initial load when no activeAnchorId)
    anchorUpdateFromEditorRef.current = true;
    setActiveAnchorId(anchors[0].id);
  }, [sourceMap, activeAnchorId, setActiveAnchorId, anchorUpdateFromEditorRef]);
}

