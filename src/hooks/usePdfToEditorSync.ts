/**
 * Simplified hook to sync editor to PDF scroll position.
 * Handles: PDF manual scroll, pointer events, locking behavior, click-to-sync.
 */

import { useEffect } from 'react';
import { TIMING } from '../constants/timing';
import type { SourceMap, SyncMode } from '../types';
import { useEditorStore } from '../stores/editorStore';
import { logger } from '../utils/logger';

// Create scoped logger
const syncLogger = logger.createScoped('PdfToEditorSync');

interface UsePdfToEditorSyncParams {
  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;
  anchorOffsetsRef: React.MutableRefObject<Map<string, number>>;
  sourceMapRef: React.MutableRefObject<SourceMap | null>;
  programmaticScrollRef: React.MutableRefObject<boolean>;
  lastProgrammaticScrollAt: React.MutableRefObject<number | null>;
  mountedAt: React.MutableRefObject<number>;
  userInteractedRef: React.MutableRefObject<boolean>;
  userManuallyPositionedPdfRef: React.MutableRefObject<boolean>;
  activeAnchorRef: React.MutableRefObject<string | null>;
  syncModeRef: React.MutableRefObject<SyncMode>;
  renderingRef: React.MutableRefObject<boolean>;
  isTypingRef: React.MutableRefObject<boolean>;
  savedScrollPositionRef: React.MutableRefObject<{ top: number; left: number } | null>;
  
  // State values (for proper React dependencies)
  rendering: boolean; // Used to trigger re-attachment when PDF ready
  
  // Actions
  setActiveAnchorId: (id: string) => void;
  setSyncMode: (mode: SyncMode) => void;
}

export function usePdfToEditorSync(params: UsePdfToEditorSyncParams): void {
  const {
    containerRef,
    anchorOffsetsRef,
    sourceMapRef,
    programmaticScrollRef,
    lastProgrammaticScrollAt,
    mountedAt,
    userInteractedRef,
    userManuallyPositionedPdfRef,
    activeAnchorRef,
    syncModeRef,
    renderingRef,
    isTypingRef,
    savedScrollPositionRef,
    rendering, // State value for dependency tracking
    setActiveAnchorId,
    setSyncMode,
  } = params;

  // Effect: Handle PDF scroll events
  // This effect depends on sourceMapRef changes to re-attach when PDF renders
  useEffect(() => {
    syncLogger.debug('scroll effect mounting...', {
      hasContainer: !!containerRef.current,
      containerClass: containerRef.current?.className,
      hasSourceMap: !!sourceMapRef.current
    });
    
    const el = containerRef.current;
    if (!el) {
      syncLogger.warn('scroll effect - no container element! Will retry when sourceMap changes.');
      return;
    }

    let scrollTimeout: number | null = null;

    // Find closest anchor to given scroll position
    const findClosestAnchor = (scrollPos: number): string | null => {
      const map = sourceMapRef.current;
      if (!map || map.anchors.length === 0) {
        syncLogger.debug('no anchors available', { map: !!map, anchorsCount: map?.anchors?.length || 0 });
        return null;
      }

      let closestId: string | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      let checkedCount = 0;

      for (const anchor of map.anchors) {
        const offset = anchorOffsetsRef.current.get(anchor.id);
        if (offset === undefined) {
          if (checkedCount < 3) {
            syncLogger.debug('no offset for anchor', { anchorId: anchor.id, totalOffsets: anchorOffsetsRef.current.size });
          }
          continue;
        }
        checkedCount++;

        const dist = Math.abs(offset - scrollPos);
        if (dist < bestDist) {
          bestDist = dist;
          closestId = anchor.id;
        }
      }
      
      syncLogger.debug('findClosestAnchor result', {
        scrollPos,
        closestId,
        bestDist,
        checkedCount,
        totalAnchors: map.anchors.length,
        totalOffsets: anchorOffsetsRef.current.size
      });

      return closestId;
    };

    // Update active anchor (debounced logic)
    // This is only called in two-way mode (see handleScroll above)
    const updateActiveAnchor = () => {
      syncLogger.debug('updateActiveAnchor called - checking for anchor update');
      
      // Find closest anchor to center of viewport
      const center = el.scrollTop + el.clientHeight / 2;
      const closestId = findClosestAnchor(center);

      syncLogger.debug('anchor analysis', { 
        center, 
        closestId, 
        currentActive: activeAnchorRef.current,
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight
      });

      if (closestId && activeAnchorRef.current !== closestId) {
        syncLogger.debug('two-way sync - updating editor anchor', { 
          from: activeAnchorRef.current,
          to: closestId 
        });
        // Set programmatic flag to prevent feedback loop (editor->PDF->editor->PDF...)
        lastProgrammaticScrollAt.current = Date.now();
        setActiveAnchorId(closestId);
      } else if (process.env.NODE_ENV !== 'production') {
        syncLogger.debug('no anchor update needed', {
          closestId,
          current: activeAnchorRef.current,
          same: closestId === activeAnchorRef.current
        });
      }
    };

    // Handle scroll event (debounced)
    const handleScroll = () => {
      // CRITICAL: Save scroll position immediately on every scroll
      // This ensures we have the latest position before any re-render
      const hasHorizontalOverflow = (el.scrollWidth - el.clientWidth) > 1;
      savedScrollPositionRef.current = {
        top: el.scrollTop,
        // Only preserve horizontal offset when content actually overflows.
        // Otherwise force it back to 0 so the PDF stays visually centered.
        left: hasHorizontalOverflow ? el.scrollLeft : 0
      };
      
      // Log FIRST before any guards
      if (process.env.NODE_ENV !== 'production') {
        syncLogger.debug('!!!! SCROLL EVENT FIRED !!!!', {
          scrollTop: el.scrollTop,
          timestamp: Date.now()
        });
      }
      
      if (process.env.NODE_ENV !== 'production') {
        syncLogger.debug('scroll event - checking guards', {
          syncMode: syncModeRef.current,
          isTyping: isTypingRef.current,
          programmatic: programmaticScrollRef.current,
          rendering: renderingRef.current
        });
      }
      
      // Ignore programmatic scrolls using timestamp
      // This prevents processing scroll events during animations/programmatic updates
      const now = Date.now();
      const lastProg = lastProgrammaticScrollAt.current ?? 0;
      if (now - lastProg < TIMING.PROGRAMMATIC_SCROLL_GUARD_MS) {
        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('ignoring programmatic scroll within guard window', {
            timeSinceLastProgrammatic: now - lastProg,
            guardMs: TIMING.PROGRAMMATIC_SCROLL_GUARD_MS
          });
        }
        return;
      }

      // Ignore if still rendering
      if (renderingRef.current) return;
      
      // CRITICAL: Don't process PDF scroll events when user is typing
      // This prevents feedback loops in two-way mode
      if (isTypingRef.current) {
        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('ignoring scroll - user is typing');
        }
        return;
      }

      // Handle based on sync mode
      if (syncModeRef.current === 'two-way') {
        // Two-way mode: update editor position, no lock
        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('two-way mode - updating editor');
        }
        // Schedule editor update
        if (scrollTimeout) window.clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(updateActiveAnchor, TIMING.SCROLL_DEBOUNCE_MS);
      } else if (syncModeRef.current === 'locked-to-editor') {
        // Locked to editor - ignore PDF scroll completely
        return;
      } else {
        // Auto mode - activate PERMANENT scroll lock (stays until user scrolls editor!)
        userInteractedRef.current = true;
        userManuallyPositionedPdfRef.current = true;
        
        // Update store state for UI feedback
        useEditorStore.getState().setScrollLocked(true);
        
        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('🔒 SCROLL LOCK ACTIVATED - PDF will not move until you scroll editor');
        }
        // Lock stays active until:
        // 1. User scrolls editor (triggers PDFPreview clearing effect)
        // 2. User clicks "Release Lock" button
        // 3. User switches to two-way mode
      }
    };

    // Attach scroll listener with passive flag for performance
    el.addEventListener('scroll', handleScroll, { passive: true });
    
    if (process.env.NODE_ENV !== 'production') {
      syncLogger.debug('scroll listener attached to element', {
        element: el,
        className: el.className,
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        isScrollable: el.scrollHeight > el.clientHeight,
        overflow: window.getComputedStyle(el).overflow,
        overflowY: window.getComputedStyle(el).overflowY
      });
    }

    return () => {
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      el.removeEventListener('scroll', handleScroll);
      if (process.env.NODE_ENV !== 'production') {
        syncLogger.debug('scroll listener removed');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Key dependency: rendering state triggers re-attachment when PDF ready
    rendering,
    // Other dependencies
    setActiveAnchorId,
    setSyncMode,
  ]);

  // Effect: Handle pointer events (clicks, drags)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointer = (ev: PointerEvent) => {
      const now = Date.now();
      const lastProg = lastProgrammaticScrollAt.current ?? 0;

      // Only process trusted (real user) events
      if (!ev.isTrusted) return;

      // Ignore if within guard period after programmatic scroll
      if (now - lastProg < TIMING.PROGRAMMATIC_SCROLL_GUARD_MS) {
        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('ignoring pointer - within programmatic guard');
        }
        return;
      }

      // Ignore if within mount guard period
      if (now - mountedAt.current < TIMING.USER_INTERACTION_MOUNT_GUARD_MS) {
        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('ignoring pointer - within mount guard');
        }
        return;
      }

      // Mark as user interaction (but respect locked-to-editor mode)
      if (syncModeRef.current !== 'locked-to-editor') {
        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('user pointer interaction');
        }
        userInteractedRef.current = true;
      }
    };

    el.addEventListener('pointerdown', handlePointer);

    return () => {
      el.removeEventListener('pointerdown', handlePointer);
    };
  }, [containerRef, lastProgrammaticScrollAt, mountedAt, userInteractedRef, syncModeRef]);

  // Effect: Handle wheel events (for detecting scroll intent)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (ev: WheelEvent) => {
      if (!ev.isTrusted) return;

      const now = Date.now();
      const lastProg = lastProgrammaticScrollAt.current ?? 0;

      // Ignore if within guard period
      if (now - lastProg < TIMING.PROGRAMMATIC_SCROLL_GUARD_MS) return;

      // Any wheel event is user interaction (but respect locked-to-editor mode)
      if (syncModeRef.current !== 'locked-to-editor') {
        userInteractedRef.current = true;

        if (process.env.NODE_ENV !== 'production') {
          syncLogger.debug('wheel event detected');
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, lastProgrammaticScrollAt, userInteractedRef, syncModeRef]);

  // Effect: Handle PDF canvas clicks (click-to-sync)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleCanvasClick = (ev: MouseEvent) => {
      if (!ev.isTrusted) return;

      const target = ev.target as HTMLElement;
      if (!target || !target.classList.contains('pdfjs-page-canvas')) return;

      const rect = el.getBoundingClientRect();
      const clickY = ev.clientY - rect.top + el.scrollTop;

      const map = sourceMapRef.current;
      if (!map || map.anchors.length === 0) return;

      let closestId: string | null = null;
      let bestDist = Number.POSITIVE_INFINITY;

      for (const anchor of map.anchors) {
        const offset = anchorOffsetsRef.current.get(anchor.id);
        if (offset === undefined) continue;

        const dist = Math.abs(offset - clickY);
        if (dist < bestDist) {
          bestDist = dist;
          closestId = anchor.id;
        }
      }

      if (closestId) {
        if (userManuallyPositionedPdfRef.current) {
          userManuallyPositionedPdfRef.current = false;
        }
        
        lastProgrammaticScrollAt.current = Date.now();
        setActiveAnchorId(closestId);
      }
    };

    el.addEventListener('click', handleCanvasClick);

    return () => {
      el.removeEventListener('click', handleCanvasClick);
    };
  }, [containerRef, sourceMapRef, anchorOffsetsRef, activeAnchorRef, lastProgrammaticScrollAt, setActiveAnchorId, userManuallyPositionedPdfRef, rendering]);
}
