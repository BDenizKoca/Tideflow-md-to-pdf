/**
 * Simplified hook to sync PDF preview to editor scroll position.
 * Handles: activeAnchorId changes, sourceMap changes, startup sync.
 *
 * Replaces: useAnchorSync, usePendingScroll, useStartupSync, useFinalSync
 */

import { useEffect, useRef } from 'react';
import type { SourceMap } from '../types';
import { checkEditorToPdfGuards } from '../utils/scrollGuards';
import { useEditorStore } from '../stores/editorStore';

interface UseEditorToPdfSyncParams {
  // State
  activeAnchorId: string | null;
  syncMode: 'auto' | 'two-way' | 'locked-to-editor' | 'locked-to-pdf';
  isTyping: boolean;
  sourceMap: SourceMap | null;
  compileStatus: { status: string; pdf_path?: string | null };

  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;
  anchorOffsetsRef: React.MutableRefObject<Map<string, number>>;
  pdfMetricsRef: React.MutableRefObject<{ page: number; height: number; scale: number }[]>;
  sourceMapRef: React.MutableRefObject<SourceMap | null>;
  syncModeRef: React.MutableRefObject<'auto' | 'two-way' | 'locked-to-editor' | 'locked-to-pdf'>;
  userInteractedRef: React.MutableRefObject<boolean>;
  userManuallyPositionedPdfRef: React.MutableRefObject<boolean>;
  programmaticScrollRef: React.MutableRefObject<boolean>;

  // Actions
  scrollToAnchor: (anchorId: string, center?: boolean, force?: boolean) => void;
  recomputeAnchorOffsets: (map: SourceMap | null) => void;
}

export function useEditorToPdfSync(params: UseEditorToPdfSyncParams): void {
  const {
    activeAnchorId,
    syncMode,
    isTyping,
    sourceMap,
    compileStatus,
    containerRef,
    anchorOffsetsRef,
    pdfMetricsRef,
    sourceMapRef,
    syncModeRef,
    userInteractedRef,
    userManuallyPositionedPdfRef,
    programmaticScrollRef,
    scrollToAnchor,
    recomputeAnchorOffsets,
  } = params;

  // Get syncEnabled from store
  const syncEnabled = useEditorStore((state) => state.syncEnabled);

  // Track if we've done initial sync
  const initialSyncDoneRef = useRef(false);
  const lastSourceMapRef = useRef<SourceMap | null>(null);
  const lastActiveAnchorIdRef = useRef<string | null>(null);
  const lastScrolledToAnchorRef = useRef<string | null>(null); // Track what we actually scrolled to
  const wasTypingRef = useRef(isTyping);
  const lastTypingStoppedAtRef = useRef<number>(0); // Track when typing stopped

  // Effect 1: Sync PDF to active anchor when it changes (normal operation)
  useEffect(() => {
    // Run all guards with new utility
    const guardResult = checkEditorToPdfGuards({
      containerRef,
      anchorOffsetsRef,
      isTypingRef: { current: isTyping },
      syncModeRef,
      userManuallyPositionedPdfRef,
      syncEnabled,
    });

    if (!guardResult.passed) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[EditorToPdfSync] skipped -', guardResult.reason);
      }
      // Still update tracking ref for duplicate check
      if (activeAnchorId) lastActiveAnchorIdRef.current = activeAnchorId;
      return;
    }

    // Don't sync if same anchor as last time (prevents feedback loop from PDF scroll handler)
    if (activeAnchorId === lastActiveAnchorIdRef.current) return;

    // Don't sync if no anchor
    if (!activeAnchorId) {
      lastActiveAnchorIdRef.current = activeAnchorId;
      return;
    }

    // Update last anchor BEFORE scrolling to prevent re-triggering
    lastActiveAnchorIdRef.current = activeAnchorId;

    // Debounce: light debounce for smooth scrolling
    const debounceMs = 20; // Always fast when not typing

    const timerId = setTimeout(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[EditorToPdfSync] syncing to anchor', { activeAnchorId });
      }
      scrollToAnchor(activeAnchorId, false, false);
      lastScrolledToAnchorRef.current = activeAnchorId; // Remember where we scrolled
    }, debounceMs);

    return () => clearTimeout(timerId);
  }, [activeAnchorId, syncMode, isTyping, syncEnabled, anchorOffsetsRef, containerRef, scrollToAnchor, userInteractedRef, userManuallyPositionedPdfRef, programmaticScrollRef, syncModeRef]);

  // Effect 1b: When user stops typing, clear the movement threshold
  // This allows the next scroll (from clicking elsewhere, etc) to work immediately
  useEffect(() => {
    const stoppedTyping = wasTypingRef.current && !isTyping;
    wasTypingRef.current = isTyping;

    if (stoppedTyping) {
      // User stopped typing - record the timestamp
      lastTypingStoppedAtRef.current = Date.now();

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[EditorToPdfSync] user stopped typing - ready for next navigation');
      }
    }
  }, [isTyping]);

  // Effect 2: Handle sourceMap changes (new render completed)
  useEffect(() => {
    // Skip if no sourceMap or same as last time
    if (!sourceMap || sourceMap === lastSourceMapRef.current) return;

    lastSourceMapRef.current = sourceMap;

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[EditorToPdfSync] sourceMap changed, recomputing offsets', {
        anchorsCount: sourceMap.anchors.length,
      });
    }

    // Recompute offsets for new render
    recomputeAnchorOffsets(sourceMap);

    // Wait for offsets to be ready, then scroll
    const checkAndScroll = () => {
      const el = containerRef.current;
      if (!el || !el.isConnected) return;

      // Check if offsets are ready
      if (anchorOffsetsRef.current.size === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] waiting for offsets after sourceMap change');
        }
        return;
      }

      // Use current activeAnchorId - don't default to first anchor!
      // If no activeAnchorId, don't scroll at all (user hasn't interacted yet)
      if (!activeAnchorId) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] no activeAnchorId yet, skipping post-render scroll');
        }
        return;
      }
      const targetAnchor = activeAnchorId;

      // Only skip post-render scroll if user has manually positioned PDF
      // AND we're not on initial render (when lastScrolledToAnchorRef is set)
      if (userManuallyPositionedPdfRef.current &&
          syncModeRef.current === 'auto' &&
          lastScrolledToAnchorRef.current !== null) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] skipping post-render scroll - user has PDF positioned elsewhere');
        }
        return;
      }

      // CRITICAL: Don't scroll PDF if user is currently typing OR just stopped typing recently
      // AND anchor hasn't changed. This prevents the "jump to top" issue.
      const anchorChanged = targetAnchor !== lastScrolledToAnchorRef.current;

      // Block scrolling if:
      // 1. User is actively typing right now, OR
      // 2. User recently stopped typing (within 3s) AND anchor hasn't changed
      if (isTyping) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] skipping post-render scroll - user is actively typing', {
            targetAnchor,
            lastScrolledTo: lastScrolledToAnchorRef.current
          });
        }
        return;
      }

      const now = Date.now();
      const timeSinceTypingStopped = now - lastTypingStoppedAtRef.current;
      if (timeSinceTypingStopped < 3000 && !anchorChanged) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] skipping post-render scroll - recently stopped typing at same anchor', {
            timeSinceTypingStopped,
            targetAnchor,
            lastScrolledTo: lastScrolledToAnchorRef.current
          });
        }
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[EditorToPdfSync] scrolling after sourceMap change', {
          targetAnchor,
          activeAnchorId,
          isTyping,
          userManuallyPositioned: userManuallyPositionedPdfRef.current
        });
      }

      scrollToAnchor(targetAnchor, true, false);
      lastScrolledToAnchorRef.current = targetAnchor; // Remember where we scrolled
    };

    // Give PDF renderer time to update metrics
    const timerId = setTimeout(checkAndScroll, 150);
    return () => clearTimeout(timerId);
  }, [
    sourceMap,
    activeAnchorId,
    isTyping,
    containerRef,
    anchorOffsetsRef,
    syncModeRef,
    userInteractedRef,
    userManuallyPositionedPdfRef,
    scrollToAnchor,
    recomputeAnchorOffsets,
    lastScrolledToAnchorRef,
  ]);

  // Effect 3: Initial startup sync (when app first loads)
  useEffect(() => {
    // Only run once
    if (initialSyncDoneRef.current) return;

    // Wait for all conditions to be ready
    const el = containerRef.current;
    if (!el || !el.isConnected) return;
    if (compileStatus.status !== 'ok' || !compileStatus.pdf_path) return;
    if (!sourceMap || sourceMap.anchors.length === 0) return;
    if (pdfMetricsRef.current.length === 0) return;

    // Don't interfere if user has already interacted
    if (userInteractedRef.current) return;

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[EditorToPdfSync] performing initial startup sync', {
        hasSourceMap: !!sourceMap,
        metricsCount: pdfMetricsRef.current.length,
        offsetsCount: anchorOffsetsRef.current.size,
      });
    }

    // Ensure offsets are computed
    if (anchorOffsetsRef.current.size === 0) {
      recomputeAnchorOffsets(sourceMap);
    }

    // Wait a bit for everything to settle, then scroll
    const timerId = setTimeout(() => {
      if (initialSyncDoneRef.current) return;
      if (userInteractedRef.current) return;

      const targetAnchor = activeAnchorId ?? sourceMap.anchors[0]?.id;
      if (targetAnchor) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] executing initial sync scroll', { targetAnchor });
        }
        scrollToAnchor(targetAnchor, true, true);
        initialSyncDoneRef.current = true;
      }
    }, 200);

    return () => clearTimeout(timerId);
  }, [
    compileStatus.status,
    compileStatus.pdf_path,
    sourceMap,
    activeAnchorId,
    containerRef,
    pdfMetricsRef,
    anchorOffsetsRef,
    userInteractedRef,
    scrollToAnchor,
    recomputeAnchorOffsets,
  ]);

  // Effect 4: Recompute offsets on resize (debounced)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let resizeTimeout: number | null = null;
    let lastWidth = el.clientWidth;
    let lastHeight = el.clientHeight;

    const resizeObserver = new ResizeObserver(() => {
      if (!sourceMapRef.current) return;

      // Only recompute if size actually changed significantly (more than 10px)
      const newWidth = el.clientWidth;
      const newHeight = el.clientHeight;
      if (Math.abs(newWidth - lastWidth) < 10 && Math.abs(newHeight - lastHeight) < 10) {
        return; // Ignore tiny fluctuations
      }

      lastWidth = newWidth;
      lastHeight = newHeight;

      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] container resized, recomputing offsets');
        }
        recomputeAnchorOffsets(sourceMapRef.current);

        // Re-sync to current anchor after resize ONLY if not locked
        // Check the lock flag, not the mode!
        const isLocked = syncModeRef.current === 'auto' && userManuallyPositionedPdfRef.current;
        if (!isLocked && syncModeRef.current !== 'locked-to-pdf' && activeAnchorId) {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[EditorToPdfSync] re-syncing after resize');
          }
          setTimeout(() => {
            scrollToAnchor(activeAnchorId, false, false);
          }, 30);
        } else if (isLocked && process.env.NODE_ENV !== 'production') {
          console.debug('[EditorToPdfSync] 🔒 resize detected but PDF is locked - not scrolling');
        }
      }, 200); // Debounce resize recomputation
    });

    resizeObserver.observe(el);
    return () => {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [containerRef, sourceMapRef, syncModeRef, activeAnchorId, scrollToAnchor, recomputeAnchorOffsets, userManuallyPositionedPdfRef]);
}
