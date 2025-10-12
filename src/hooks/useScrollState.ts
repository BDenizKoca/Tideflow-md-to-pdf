/**
 * Hook to manage scroll-related state and refs in PDFPreview.
 * Centralizes all scroll tracking, programmatic scroll detection,
 * and user interaction state.
 */

import { useEffect, useRef } from 'react';
import type { SyncMode } from '../types';

export interface ScrollStateRefs {
  containerRef: React.RefObject<HTMLDivElement | null>;
  programmaticScrollRef: React.MutableRefObject<boolean>;
  lastProgrammaticScrollAt: React.MutableRefObject<number | null>;
  userInteractedRef: React.MutableRefObject<boolean>;
  userManuallyPositionedPdfRef: React.MutableRefObject<boolean>;
  initialForcedScrollDoneRef: React.MutableRefObject<boolean>;
  savedScrollPositionRef: React.MutableRefObject<{ top: number; left: number } | null>;
  // Sync refs (kept in sync with props/state)
  syncModeRef: React.MutableRefObject<SyncMode>;
  activeAnchorRef: React.MutableRefObject<string | null>;
  isTypingRef: React.MutableRefObject<boolean>;
  renderingRef: React.MutableRefObject<boolean>;
}

export interface UseScrollStateParams {
  syncMode: SyncMode;
  activeAnchorId: string | null;
  isTyping: boolean;
  rendering: boolean;
}

export function useScrollState(params: UseScrollStateParams): ScrollStateRefs {
  const { syncMode, activeAnchorId, isTyping, rendering } = params;

  // Core container reference
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Scroll behavior tracking
  const programmaticScrollRef = useRef(false);
  const lastProgrammaticScrollAt = useRef<number | null>(null);
  const userInteractedRef = useRef(false);
  const userManuallyPositionedPdfRef = useRef(false); // Tracks if user scrolled PDF away from synced position

  // One-shot startup sync guard
  const initialForcedScrollDoneRef = useRef(false);

  // Saved scroll position for preservation during re-renders
  const savedScrollPositionRef = useRef<{ top: number; left: number } | null>(null);

  // Sync refs for stable access in callbacks
  const syncModeRef = useRef(syncMode);
  useEffect(() => {
    syncModeRef.current = syncMode;
  }, [syncMode]);

  const activeAnchorRef = useRef<string | null>(activeAnchorId);
  useEffect(() => {
    activeAnchorRef.current = activeAnchorId;
  }, [activeAnchorId]);

  const isTypingRef = useRef(isTyping);
  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  const renderingRef = useRef(rendering);
  useEffect(() => {
    renderingRef.current = rendering;
  }, [rendering]);

  return {
    containerRef,
    programmaticScrollRef,
    lastProgrammaticScrollAt,
    userInteractedRef,
    userManuallyPositionedPdfRef,
    initialForcedScrollDoneRef,
    savedScrollPositionRef,
    syncModeRef,
    activeAnchorRef,
    isTypingRef,
    renderingRef,
  };
}
