import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import './PDFPreview.css';
import PDFPreviewHeader from './PDFPreviewHeader';
import { usePdfRenderer } from '../hooks/usePdfRenderer';
import { useScrollState } from '../hooks/useScrollState';
import { useOffsetManager } from '../hooks/useOffsetManager';
import { useEditorToPdfSync } from '../hooks/useEditorToPdfSync';
import { usePdfToEditorSync } from '../hooks/usePdfToEditorSync';
import { UI } from '../constants/timing';
import { 
  ThumbnailsSidebar, 
  PDFViewer,
  generateThumbnailsFromCanvases,
  detectCurrentPage,
  scrollThumbnailToActive,
  scrollToPage as scrollToPageUtil,
  initializePdfWorker
} from './PDFPreview/index';

// Initialize PDF.js worker once
initializePdfWorker();

const PDFPreview: React.FC = () => {
  // Store state
  const { editor, sourceMap, activeAnchorId, setActiveAnchorId, syncMode, setSyncMode, isTyping } = useEditorStore();
  const { compileStatus } = editor;
  const { pdfZoom, setPdfZoom, thumbnailsVisible } = useUIStore();
  const preferences = usePreferencesStore((state) => state.preferences);

  // Local state
  const [rendering, setRendering] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());

  // Rendering control refs
  const cancelRenderRef = useRef<{ canceled: boolean }>({ canceled: false });
  const mountedAt = useRef<number>(Date.now());

  // Pending scroll state refs
  const pendingFallbackRef = useRef<Map<string, number> | null>(null);
  const pendingFallbackTimerRef = useRef<number | null>(null);
  const pendingForcedTimerRef = useRef<number | null>(null);
  const pendingForcedOneShotRef = useRef<number | null>(null);
  const pendingForcedAnchorRef = useRef<string | null>(null);
  const savedScrollPositionRef = useRef<{ top: number; left: number } | null>(null);


  
  // Use scroll state hook - consolidates 19 refs
  const scrollState = useScrollState({
    syncMode,
    activeAnchorId,
    isTyping,
    rendering,
  });

  const {
    containerRef,
    programmaticScrollRef,
    lastProgrammaticScrollAt,
    userInteractedRef,
    userManuallyPositionedPdfRef,
    initialForcedScrollDoneRef,
    syncModeRef,
    activeAnchorRef,
    isTypingRef,
  } = scrollState;

  // Legacy refs no longer used (kept in scrollState for backward compat)
  // startupOneShotAppliedRef, finalRefreshDoneRef

  // Temporary ref for registerPendingAnchor to avoid circular dependency
  const registerPendingAnchorRef = useRef<((anchorId: string) => void) | null>(null);

  // Memoize the callback to prevent recreating it on every render
  const registerPendingAnchorCallback = useCallback((anchorId: string) => {
    if (registerPendingAnchorRef.current) {
      registerPendingAnchorRef.current(anchorId);
    }
  }, []); // Empty deps - uses ref which is always stable

  // Memoize the scrollStateRefs object to prevent recreating it on every render
  // Refs are stable and don't change, so this object can be created once
  const scrollStateRefs = useMemo(() => ({
    syncModeRef,
    activeAnchorRef,
    userInteractedRef,
    initialForcedScrollDoneRef,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []); // Empty deps - all values are refs which are stable

  // Use offset manager hook
  const offsetManager = useOffsetManager({
    sourceMap,
    scrollStateRefs,
    registerPendingAnchor: registerPendingAnchorCallback,
  });

  const { anchorOffsetsRef, pdfMetricsRef, sourceMapRef, recomputeAnchorOffsets } = offsetManager;

  const renderingRef = useRef(rendering);
  useEffect(() => { renderingRef.current = rendering; }, [rendering]);

  const scrollToAnchor = useCallback((anchorId: string, center = false, force = false) => {
    const el = containerRef.current;
    // Ensure the container is still attached to the document
    if (!el || !el.parentNode || !el.isConnected) return;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PDFPreview] scrollToAnchor: anchor=${anchorId}, force=${force}, center=${center}`);
    }
    
    const offset = anchorOffsetsRef.current.get(anchorId);
    if (offset === undefined) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PDFPreview] no offset for anchor', { anchorId });
      }
      return;
    }
    
    // Calculate target position with bias
    const bias = center ? el.clientHeight / 2 : el.clientHeight * 0.3;
    const target = Math.max(0, offset - bias);
    const currentTop = el.scrollTop ?? 0;
    
    // Skip if already at target position (within tolerance)
    if (Math.abs(currentTop - target) <= UI.SCROLL_POSITION_TOLERANCE_PX) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PDFPreview] already at target', { anchorId, target, currentTop });
      }
      return;
    }
    
    // Only guard against near-top jumps during initial forced scroll (startup)
    // After that, allow all scrolls to support normal document navigation
    if (force && !initialForcedScrollDoneRef.current) {
      // First forced scroll - mark it complete
      initialForcedScrollDoneRef.current = true;
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PDFPreview] initial forced scroll completed', { anchorId });
      }
    }
    
    // Set programmatic scroll flag
    programmaticScrollRef.current = true;
    lastProgrammaticScrollAt.current = Date.now();
    const beforeTop = el.scrollTop;
    
    // Perform the scroll
    el.scrollTo({ top: target, behavior: 'auto' });
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[PDFPreview] scrolled', { anchorId, from: beforeTop, to: target, delta: target - beforeTop });
    }
    
        // Clear programmatic flag after scroll completes
    requestAnimationFrame(() => {
      setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 50); // Quick clear for responsive two-way sync
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Refs are stable and don't need to be in dependency array

  // Clear manual position flag when switching to locked-to-editor or two-way mode
  useEffect(() => {
    if (syncMode === 'locked-to-editor' || syncMode === 'two-way') {
      userManuallyPositionedPdfRef.current = false;
      useEditorStore.getState().setScrollLocked(false);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PDFPreview] cleared manual position flag - mode:', syncMode);
      }
    }
  }, [syncMode, userManuallyPositionedPdfRef]);

  // Auto-switch from two-way to auto when typing starts
  // Two-way mode is for reading/navigation - when editing, switch to one-way (auto)
  const prevIsTypingForModeRef = useRef(isTyping);
  useEffect(() => {
    const startedTyping = !prevIsTypingForModeRef.current && isTyping;
    prevIsTypingForModeRef.current = isTyping;
    
    if (startedTyping && syncMode === 'two-way') {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PDFPreview] 🔄 typing detected in two-way mode - switching to auto');
      }
      setSyncMode('auto');
    }
  }, [isTyping, syncMode, setSyncMode]);

  // Clear manual position flag ONLY on explicit editor scroll (not typing-induced changes)
  // We detect this by tracking when anchor changes due to editor scroll events, not typing
  const prevAnchorIdRef = useRef<string | null>(activeAnchorId);
  const prevIsTypingRef = useRef(isTyping);
  useEffect(() => {
    const wasTyping = prevIsTypingRef.current;
    const anchorChanged = activeAnchorId !== prevAnchorIdRef.current;
    
    // Only release lock if:
    // 1. User is NOT currently typing
    // 2. User was NOT typing before (prevents clearing on typing→not-typing transition)
    // 3. Anchor actually changed (user scrolled/navigated editor)
    if (!isTyping && !wasTyping && anchorChanged && activeAnchorId) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PDFPreview] 🔓 clearing PDF lock - user SCROLLED/NAVIGATED editor', {
          from: prevAnchorIdRef.current,
          to: activeAnchorId
        });
      }
      userManuallyPositionedPdfRef.current = false;
      useEditorStore.getState().setScrollLocked(false);
    }
    
    prevAnchorIdRef.current = activeAnchorId;
    prevIsTypingRef.current = isTyping;
  }, [activeAnchorId, isTyping, userManuallyPositionedPdfRef]);

  // SIMPLIFIED: Editor → PDF sync (replaces useAnchorSync, usePendingScroll, useStartupSync, useFinalSync)
  useEditorToPdfSync({
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
  });

  // SIMPLIFIED: PDF → Editor sync (replaces usePdfSync, usePreviewEvents)
  usePdfToEditorSync({
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
    renderingRef: scrollState.renderingRef,
    isTypingRef,
    savedScrollPositionRef,
    rendering, // Pass state value so effect can re-run when PDF ready
    setActiveAnchorId,
    setSyncMode,
  });

  // Pending anchor management
  const registerPendingAnchor = useCallback((anchorId: string) => {
    pendingForcedAnchorRef.current = anchorId;
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[PDFPreview] registered pending anchor', { anchorId });
    }
  }, []);

  const consumePendingAnchor = useCallback((checkOffset = true) => {
    const anchorId = pendingForcedAnchorRef.current;
    if (!anchorId) return;

    if (checkOffset && anchorOffsetsRef.current.size === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PDFPreview] consumePendingAnchor: no offsets yet, skipping');
      }
      return;
    }

    pendingForcedAnchorRef.current = null;
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[PDFPreview] consuming pending anchor', { anchorId, offsets: anchorOffsetsRef.current.size });
    }

    requestAnimationFrame(() => {
      scrollToAnchor(anchorId, false, true);
    });
  }, [anchorOffsetsRef, scrollToAnchor]);

  const mountSignal = 0;

  // Wire up the registerPendingAnchor to the ref
  registerPendingAnchorRef.current = registerPendingAnchor;

  // PDF renderer hook
  usePdfRenderer({
    currentFile: editor.currentFile,
    compileStatus,
    pdfZoom,
    containerRef,
    cancelRenderRef,
    pdfMetricsRef,
    anchorOffsetsRef,
    sourceMapRef,
    userInteractedRef,
    syncModeRef,
    isTypingRef,
    programmaticScrollRef,
    savedScrollPositionRef,
    pendingFallbackRef,
    pendingFallbackTimerRef,
    pendingForcedTimerRef,
    pendingForcedAnchorRef,
    pendingForcedOneShotRef,
    initialForcedScrollDoneRef,
    setRendering,
    setPdfError,
    recomputeAnchorOffsets,
    scrollToAnchor,
    registerPendingAnchor,
    consumePendingAnchor,
    activeAnchorId,
    preferences: { toc: preferences.toc, cover_page: preferences.cover_page },
    mountSignal,
  });

  // Offset-transition watcher: polls briefly for offsets when a pending
  // forced anchor is registered and consumes it once offsets become
  // available. Defensive guards cancel the watcher if the container
  // disappears (e.g., during document switch) to avoid DOM ops after
  // unmount.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[PDFPreview] offset-transition watcher mounted');
    }
    const checkPending = () => {
      if (!containerRef.current) return;
      try {
        const pending = pendingForcedAnchorRef.current;
        if (!pending) return;
        if (anchorOffsetsRef.current.size === 0) return;
        // If offsets are now available for the pending anchor, consume it.
        const off = anchorOffsetsRef.current.get(pending);
        if (off !== undefined) {
          consumePendingAnchor();
        }
      } catch {
        // swallow silently
      }
    };
    
    // Check immediately, then once more after a frame (offsets may arrive asynchronously)
    checkPending();
    const rafId = requestAnimationFrame(checkPending);
    return () => cancelAnimationFrame(rafId);
  }, [consumePendingAnchor, anchorOffsetsRef, containerRef]);

  // ✅ ALL OLD HOOKS REPLACED WITH 2 NEW SIMPLIFIED HOOKS ABOVE ✅
  // Removed: usePdfSync, useAnchorSync, useDocumentLifecycle, useFinalSync, usePreviewEvents
  // Total removed: ~800 lines of complex sync logic
  // Replaced with: useEditorToPdfSync + usePdfToEditorSync (~400 lines)

  // Track current page and generate thumbnails
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !compileStatus.pdf_path || rendering) return;

    const handleScroll = () => {
      const canvases = container.querySelectorAll('canvas.pdfjs-page-canvas');
      if (canvases.length === 0) return;

      const newPage = detectCurrentPage(container);
      setCurrentPage(newPage);
      scrollThumbnailToActive();
    };

    // Generate thumbnails when PDF is loaded
    const handleThumbnailsGenerated = (newThumbnails: Map<number, string>, total: number) => {
      setThumbnails(newThumbnails);
      setTotalPages(total);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial page detection

    // Wait for rendering to complete before generating thumbnails
    let cleanupThumbnails: (() => void) | void;
    const timer = setTimeout(() => {
      cleanupThumbnails = generateThumbnailsFromCanvases(container, handleThumbnailsGenerated);
    }, UI.THUMBNAIL_GENERATION_DELAY_MS);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
      if (cleanupThumbnails) cleanupThumbnails();
    };
  }, [compileStatus.pdf_path, rendering, containerRef]);

  const handlePageClick = (pageNum: number) => {
    const container = containerRef.current;
    if (!container) return;
    scrollToPageUtil(container, pageNum);
  };

  return (
    <div className="pdf-preview">
      <PDFPreviewHeader
        pdfZoom={pdfZoom}
        setPdfZoom={setPdfZoom}
      />
      
      <div className="pdf-preview-content">
        {thumbnailsVisible && (
          <ThumbnailsSidebar
            thumbnails={thumbnails}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageClick={handlePageClick}
          />
        )}
        
        <PDFViewer
          containerRef={containerRef}
          rendering={rendering}
          compileStatus={compileStatus}
          pdfError={pdfError}
        />
      </div>
    </div>
  );
};

export default PDFPreview;
