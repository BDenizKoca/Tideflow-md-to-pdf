import { useEffect } from 'react';
import { renderPdfPages } from '../utils/pdfRenderer';
import { extractOffsetsFromPdfText } from '../utils/offsets';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ANCHOR } from '../constants/timing';
import type { SourceMap } from '../types';

interface UsePdfRendererArgs {
  currentFile: string | null;
  compileStatus: { status: string; pdf_path?: string | null };
  pdfZoom: number;
  containerRef: React.RefObject<HTMLElement | null>;
  cancelRenderRef: { current: { canceled: boolean } };
  // mutable refs shared with component
  pdfMetricsRef: { current: { page: number; height: number; scale: number }[] };
  anchorOffsetsRef: { current: Map<string, number> };
  sourceMapRef: { current: SourceMap | null };
  // New refs to respect manual user interaction and sync mode
  userInteractedRef: { current: boolean };
  syncModeRef: { current: import('../types').SyncMode };
  isTypingRef: { current: boolean };
  programmaticScrollRef: { current: boolean };
  savedScrollPositionRef: { current: { top: number; left: number } | null };
  pendingFallbackRef: { current: Map<string, number> | null };
  pendingFallbackTimerRef: { current: number | null };
  pendingForcedTimerRef: { current: number | null };
  pendingForcedAnchorRef: { current: string | null };
  pendingForcedOneShotRef?: { current: number | null };
  // accept external pending-scroll handlers so the component can
  // create a single stable instance and share it across renderer
  // and preview logic.
  registerPendingAnchor?: (anchorId: string) => void;
  consumePendingAnchor?: (checkOffset?: boolean) => void;
  initialForcedScrollDoneRef: { current: boolean };
  setRendering: (v: boolean) => void;
  setPdfError: (v: string | null) => void;
  recomputeAnchorOffsets: (map: SourceMap | null) => void;
  scrollToAnchor: (id: string, center?: boolean, force?: boolean) => void;
  activeAnchorId?: string | null;
  preferences?: { toc: boolean; cover_page: boolean };
  mountSignal?: number;
}

export function usePdfRenderer(args: UsePdfRendererArgs) {
  const {
    currentFile,
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
    initialForcedScrollDoneRef,
    setRendering,
    setPdfError,
    recomputeAnchorOffsets,
    scrollToAnchor,
  } = args;

  // prefer externally supplied handlers to avoid multiple hook
  // instances and duplicated timers; call fallbacks if not provided
  const registerPendingAnchor = args.registerPendingAnchor;
  const consumePendingAnchor = args.consumePendingAnchor;

  useEffect(() => {
    const localCancel = cancelRenderRef.current;
    const load = async () => {
      if (!currentFile || compileStatus.status !== 'ok' || !compileStatus.pdf_path) {
        setPdfError(null);
        setRendering(false);
        if (containerRef.current && containerRef.current.isConnected) {
          try {
            while (containerRef.current.firstChild) containerRef.current.removeChild(containerRef.current.firstChild);
          } catch { try { containerRef.current.innerHTML = ''; } catch { /* swallow */ } }
        }
        pdfMetricsRef.current = [];
        anchorOffsetsRef.current = new Map();
        return;
      }
      if (!containerRef.current) return;
      
      // CRITICAL: Use saved scroll position from ref instead of reading from DOM
      // The DOM may have been reset to 0 by React before this effect runs
      const savedPosition = savedScrollPositionRef.current ?? {
        top: containerRef.current.scrollTop,
        left: containerRef.current.scrollLeft
      };
      
      setRendering(true);
      setPdfError(null);
      localCancel.canceled = false;
      // Reset the one-shot forced-scroll guard for this new PDF so we can
      // attempt an initial auto-sync. This avoids a stale true value from
      // previous render passes preventing the automatic scroll.
      initialForcedScrollDoneRef.current = false;
      try {
        // Ensure file paths are converted to a browser-loadable URL when
        // running inside Tauri; convertFileSrc handles file:// -> http(s)
        // served blob URLs required by pdf.js.
        let fileUrl = convertFileSrc(compileStatus.pdf_path ?? '');

        // HACK: Workaround for Tauri bug on Linux where convertFileSrc produces
        // an incorrect URL for absolute paths (e.g. //localhost/%2Fpath...).
        // We manually reconstruct it using the tauri protocol.
        if (fileUrl.startsWith('//localhost/')) {
          const fixedPath = (compileStatus.pdf_path ?? '').replace(/\\/g, '/');
          fileUrl = `https://tauri.localhost/${fixedPath}`;
        }
        
        fileUrl += `?v=${Date.now()}`;
        const renderScale = pdfZoom;
        const { doc, metrics } = await renderPdfPages(fileUrl, containerRef.current, renderScale, localCancel, savedPosition, programmaticScrollRef);
        if (localCancel.canceled) return;
        pdfMetricsRef.current = metrics;

        const tryComputeAndMaybeScroll = async () => {
          const map = sourceMapRef.current;
          if (!map) return; // SourceMap should already be set by render event

          recomputeAnchorOffsets(map);

          // Always attempt PDF-text extraction as fallback if typst query produced no anchors
          // This happens naturally when sourceMap.anchors.length === 0
          try {
            if (map.anchors.length === 0) {
              if (process.env.NODE_ENV !== 'production') console.debug('[usePdfRenderer] no typst anchors, running PDF-text extraction fallback');
              try {
                const extracted = await extractOffsetsFromPdfText(doc, metrics, map.anchors, renderScale);
                      if (extracted.size > 0) {
                        const prev = anchorOffsetsRef.current.size;
                        anchorOffsetsRef.current = extracted;
                        if (prev === 0 && extracted.size > 0 && !initialForcedScrollDoneRef.current && syncModeRef.current !== 'locked-to-pdf' && !args.activeAnchorId) {
                          // Smart fallback: anchor at SMART_FALLBACK_POSITION into document
                          const targetIndex = Math.floor(map.anchors.length * ANCHOR.SMART_FALLBACK_POSITION);
                          const anchorId = map.anchors[targetIndex]?.id ?? map.anchors[0]?.id ?? null;
                          if (anchorId) {
                            if (registerPendingAnchor) {
                              registerPendingAnchor(anchorId);
                              if (process.env.NODE_ENV !== 'production') console.debug('[usePdfRenderer] pendingForcedAnchor registered (extraction, typst failed) via shared handler', { anchorId });
                            } else {
                              pendingForcedAnchorRef.current = anchorId;
                              if (process.env.NODE_ENV !== 'production') console.debug('[usePdfRenderer] pendingForcedAnchor registered (extraction, typst failed)', { anchorId });
                            }
                          }
                        }
                      }
              } catch (e) {
                if (process.env.NODE_ENV !== 'production') console.debug('[usePdfRenderer] immediate extraction failed', e);
              }
            }
          } catch (e) {
            void e;
          }

          // If offsets still empty, try PDF-text extraction (single attempt)
          if (anchorOffsetsRef.current.size === 0 && (map?.anchors.length ?? 0) > 0) {
            try {
              const map = sourceMapRef.current!;
              const extracted = await extractOffsetsFromPdfText(doc, metrics, map.anchors, renderScale);
                if (extracted.size > 0) {
                const prev = anchorOffsetsRef.current.size;
                anchorOffsetsRef.current = extracted;
                // Don't perform a forced scroll while rendering is still in
                // progress here. Instead register the first anchor as a
                // pending forced scroll target. The post-render block at
                // the end of this function will perform the actual scroll
                // once rendering completes; if the user is typing we keep
                // a timer that will fire when typing stops.
                if (prev === 0 && extracted.size > 0 && !initialForcedScrollDoneRef.current && syncModeRef.current !== 'locked-to-pdf' && !args.activeAnchorId) {
                  // Smart fallback: anchor 20-30% into document
                  const targetIndex = Math.floor(map.anchors.length * 0.25);
                  const anchorId = map.anchors[targetIndex]?.id ?? map.anchors[0]?.id ?? null;
                  if (anchorId) {
                      if (registerPendingAnchor) registerPendingAnchor(anchorId);
                      else pendingForcedAnchorRef.current = anchorId;
                  }
                }
              }
            } catch (_e) {
              console.debug('[usePdfRenderer] extraction failed', _e);
            }

            const anchors = sourceMapRef.current!.anchors;
            const el = containerRef.current;
            if (el) {
              const avail = Math.max(0, el.scrollHeight - el.clientHeight);
              const fallback = new Map<string, number>();
              if (process.env.NODE_ENV !== 'production') {
                console.debug('[usePdfRenderer] creating fallback offsets', { 
                  anchors: anchors.length, 
                  avail, 
                  scrollHeight: el.scrollHeight, 
                  clientHeight: el.clientHeight 
                });
              }
              for (let i = 0; i < anchors.length; i++) {
                const frac = i / Math.max(1, anchors.length - 1);
                let pos = Math.round(frac * avail);
                if (avail > 100 && pos < 8) pos = 8;
                fallback.set(anchors[i].id, pos);
              }
              if (anchorOffsetsRef.current.size === 0) {
                // Apply fallback immediately if not typing OR if this is initial startup
                // At startup, user hasn't interacted yet, so it's safe to apply fallback
                const shouldApplyImmediately = !isTypingRef.current || !userInteractedRef.current;
                
                if (shouldApplyImmediately) {
                  anchorOffsetsRef.current = fallback;
                  if (process.env.NODE_ENV !== 'production') {
                    console.debug('[usePdfRenderer] applied fallback offsets immediately', { 
                      size: fallback.size,
                      isTyping: isTypingRef.current,
                      userInteracted: userInteractedRef.current,
                      sample: Array.from(fallback.entries()).slice(0, 3)
                    });
                  }
                  // Register pending anchor ONLY on true initial startup (no activeAnchorId yet AND no initial scroll done)
                  // Once initial scroll is done, normal sync handles all position updates
                  if (!args.activeAnchorId && !initialForcedScrollDoneRef.current) {
                    // True startup: pick a smart initial anchor
                    const anchors = sourceMapRef.current?.anchors ?? [];
                    let anchorId: string | null = null;
                    let targetIndex = 0;
                    
                    if (anchors.length > 0) {
                      // Smart fallback: use anchor at SMART_FALLBACK_POSITION into document (better than start)
                      // This shows some content without being too far in
                      targetIndex = Math.floor(anchors.length * ANCHOR.SMART_FALLBACK_POSITION);
                      anchorId = anchors[targetIndex]?.id ?? anchors[0]?.id;
                    }
                    
                    if (anchorId) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.debug('[usePdfRenderer] registering pending anchor', { 
                          anchorId, 
                          activeAnchorId: args.activeAnchorId,
                          anchorCount: anchors.length,
                          targetIndex,
                          reason: 'true startup - smart fallback at 25% into doc'
                        });
                      }
                      if (registerPendingAnchor) registerPendingAnchor(anchorId);
                      else pendingForcedAnchorRef.current = anchorId;
                    }
                  } else if (process.env.NODE_ENV !== 'production') {
                    console.debug('[usePdfRenderer] skipping pending anchor - user has position', {
                      activeAnchorId: args.activeAnchorId
                    });
                  }
                } else {
                  // Store fallback to be applied when typing stops (handled by useEditorToPdfSync)
                  pendingFallbackRef.current = fallback;
                  if (process.env.NODE_ENV !== 'production') {
                    console.debug('[usePdfRenderer] stored fallback for later (user actively typing)', { 
                      size: fallback.size,
                      isTyping: isTypingRef.current
                    });
                  }
                  // ONLY register pending anchor on true startup (no activeAnchorId AND no initial scroll done)
                  // Once initial scroll is done, normal sync handles all position updates
                  if (!args.activeAnchorId && !initialForcedScrollDoneRef.current) {
                    // Smart fallback: anchor at SMART_FALLBACK_POSITION into document
                    const anchors = sourceMapRef.current?.anchors ?? [];
                    const targetIndex = Math.floor(anchors.length * ANCHOR.SMART_FALLBACK_POSITION);
                    const anchorId = anchors[targetIndex]?.id ?? anchors[0]?.id ?? null;
                    if (anchorId) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.debug('[usePdfRenderer] registering pending anchor (typing)', {
                          anchorId,
                          activeAnchorId: args.activeAnchorId,
                          reason: 'true startup - no activeAnchorId'
                        });
                      }
                      if (registerPendingAnchor) registerPendingAnchor(anchorId);
                      else pendingForcedAnchorRef.current = anchorId;
                    }
                  } else if (process.env.NODE_ENV !== 'production') {
                    console.debug('[usePdfRenderer] skipping pending anchor - user has position (typing)', {
                      activeAnchorId: args.activeAnchorId
                    });
                  }
                }
              }
            }
          }

          setRendering(false);

          // If an earlier extraction/fallback registered a pending forced
          // anchor, perform that forced scroll now that rendering has
          // completed via the consumePendingAnchor handler (which uses a single RAF)
          if (process.env.NODE_ENV !== 'production') console.debug('[usePdfRenderer] post-render check', { pending: pendingForcedAnchorRef.current, initialForced: initialForcedScrollDoneRef.current, isTyping: isTypingRef.current });
          if (pendingForcedAnchorRef.current && !initialForcedScrollDoneRef.current) {
              if (consumePendingAnchor) {
                consumePendingAnchor();
              }
          }
        };
        tryComputeAndMaybeScroll();
      } catch (e) {
        if (!localCancel.canceled) {
          setPdfError(e instanceof Error ? e.message : String(e));
          setRendering(false);
        }
      }
    };
    load();
    return () => {
      localCancel.canceled = true;
      if (pendingFallbackTimerRef.current) { window.clearInterval(pendingFallbackTimerRef.current); pendingFallbackTimerRef.current = null; }
      if (pendingForcedTimerRef.current) { window.clearInterval(pendingForcedTimerRef.current); pendingForcedTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Only include non-ref values that should trigger re-render
    currentFile,
    compileStatus.status,
    compileStatus.pdf_path,
    pdfZoom,
    // Stable callbacks (already memoized)
    recomputeAnchorOffsets,
    scrollToAnchor,
    setRendering,
    setPdfError,
    consumePendingAnchor,
    registerPendingAnchor,
    // Optional mount signal for forcing re-render
    args.mountSignal,
    // NOTE: Refs are accessed via .current and are stable - they don't need to be in deps
  ]);
}
