import * as pdfjsLib from 'pdfjs-dist';
import { logger } from './logger';

// Create scoped logger
const pdfLogger = logger.createScoped('pdfRenderer');

export interface CancelToken { canceled: boolean }
export interface PageMetric { page: number; height: number; scale: number }
export interface SavedScrollPosition { top: number; left: number }

/**
 * Device pixels we're willing to hold across every page canvas at once, roughly
 * 256MB of RGBA. Every page is rasterised up front (there is no virtualisation),
 * so long documents have to trade sharpness for memory.
 */
const CANVAS_PIXEL_BUDGET = 64_000_000;

/** Ceiling for one page, well under the browser's per-canvas area limit. */
const MAX_PAGE_PIXELS = 16_777_216;

/**
 * Device pixels to render per CSS pixel. At 1 the compositor upscales the
 * canvas on HiDPI and fractionally-scaled displays, which is why the preview
 * looks blurry while the exported PDF is sharp. Never returns less than 1.
 */
export function getOutputScale(cssWidth: number, cssHeight: number, pageCount: number): number {
  const pageArea = cssWidth * cssHeight;
  if (pageArea <= 0) return 1;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  // Past 3x the extra sharpness is imperceptible but the cost is not.
  const wanted = Math.min(Math.max(dpr, 1), 3);
  const perPageCap = Math.min(MAX_PAGE_PIXELS, CANVAS_PIXEL_BUDGET / Math.max(pageCount, 1));

  return Math.max(Math.min(wanted, Math.sqrt(perPageCap / pageArea)), 1);
}

/**
 * Render PDF pages into the provided container and return the pdf doc and
 * collected page metrics. Renders pages in parallel and supports early
 * cancellation via the cancel token.
 */
export async function renderPdfPages(
  fileUrlOrData: string | Uint8Array,
  container: HTMLElement,
  renderScale = 1.0,
  cancelToken: CancelToken,
  savedScrollPosition?: SavedScrollPosition,
  programmaticScrollRef?: React.MutableRefObject<boolean>
): Promise<{ doc: pdfjsLib.PDFDocumentProxy; metrics: PageMetric[] }> {
  // Accept either URL or binary data - binary data works better with PDF.js worker
  const docSource = typeof fileUrlOrData === 'string' 
    ? { url: fileUrlOrData } 
    : { data: fileUrlOrData };
  const doc = await pdfjsLib.getDocument(docSource).promise;
  if (cancelToken.canceled) throw new Error('canceled');

  const frag = document.createDocumentFragment();
  const tmpWrap = document.createElement('div');
  tmpWrap.style.display = 'contents';
  const metrics: PageMetric[] = [];
  const pagePromises: Promise<void>[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    if (cancelToken.canceled) break;
    const pNum = pageNum;
    const p = (async () => {
      if (cancelToken.canceled) return;
      const page = await doc.getPage(pNum);
      if (cancelToken.canceled) return;
      const viewport = page.getViewport({ scale: renderScale });
      metrics.push({ page: pNum, height: viewport.height, scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.className = 'pdfjs-page-canvas';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Backing store in device pixels, CSS box in layout pixels, so scroll
      // offsets and click-to-sync keep working in the units they expect.
      const outputScale = getOutputScale(viewport.width, viewport.height, doc.numPages);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      tmpWrap.appendChild(canvas);
      const transform = outputScale === 1
        ? undefined
        : [outputScale, 0, 0, outputScale, 0, 0];
      await page.render({ canvasContext: ctx, viewport, transform }).promise;
    })();
    pagePromises.push(p);
  }

  await Promise.all(pagePromises);
  frag.appendChild(tmpWrap);
  // Safely replace container children. It's possible the container
  // was removed from the DOM during a fast document switch or
  // unmount; guard against that and avoid calling removeChild on
  // nodes that aren't present.
  try {
    if (cancelToken.canceled) throw new Error('canceled');
    if (!container.isConnected) {
      // Container no longer in DOM; abort appending fragment.
      return { doc, metrics };
    }

    // Captured before the render started, if we have it; the live value is a
    // fallback, and by now the container is about to be emptied.
    const scrollTop = savedScrollPosition?.top ?? container.scrollTop;
    const scrollLeft = savedScrollPosition?.left ?? container.scrollLeft;

    pdfLogger.debug('Preserving scroll position', {
      scrollTop,
      scrollLeft,
      fromSaved: !!savedScrollPosition,
      containerScrollTop: container.scrollTop,
      willRestore: scrollTop > 0
    });

    // Hide during the swap so the reader never sees the pre-restore position.
    // Only worth it when there is actually a position to restore.
    const shouldHide = scrollTop > 0;
    if (shouldHide) {
      container.classList.add('restoring-scroll');
    }

    // Prefer iterative removeChild which is safer across browsers
    // than assigning innerHTML when nodes may be mid-mutation.
    try {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    } catch {
      // Fallback to innerHTML clear if removeChild fails for any reason.
      try { container.innerHTML = ''; } catch { /* swallow */ }
    }
    container.appendChild(frag);

    const horizontalOverflow = (container.scrollWidth - container.clientWidth) > 1;
    const targetLeftImmediate = horizontalOverflow ? scrollLeft : 0;
    container.scrollLeft = targetLeftImmediate;

    // Restore after a frame, once the new canvases have been laid out —
    // otherwise the pane jumps to the top on every re-render.
    requestAnimationFrame(() => {
      if (container.isConnected) {
        const beforeTop = container.scrollTop;
        const rafHorizontalOverflow = (container.scrollWidth - container.clientWidth) > 1;
        const targetLeft = rafHorizontalOverflow ? scrollLeft : 0;

        pdfLogger.debug('Restoring scroll position', {
          targetTop: scrollTop,
          beforeTop,
          targetLeft,
          horizontalOverflow: rafHorizontalOverflow,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          scrollWidth: container.scrollWidth,
          clientWidth: container.clientWidth
        });

        // Set programmatic scroll guard to prevent scroll events from triggering sync
        if (programmaticScrollRef) {
          programmaticScrollRef.current = true;
        }

        container.scrollTop = scrollTop;
        container.scrollLeft = targetLeft;

        // Remove the hiding class to reveal the PDF at the correct position
        if (shouldHide) {
          container.classList.remove('restoring-scroll');
        }

        pdfLogger.debug('Restored scroll position', {
          targetTop: scrollTop,
          actualTop: container.scrollTop,
          targetLeft,
          actualLeft: container.scrollLeft,
          horizontalOverflow: rafHorizontalOverflow,
          topSuccess: Math.abs(container.scrollTop - scrollTop) < 5
        });
      }
    });
  } catch (e) {
    // If cancellation was requested, propagate; otherwise just
    // return gracefully without attempting DOM operations.
    if (e instanceof Error && e.message === 'canceled') throw e;
    return { doc, metrics };
  }
  return { doc, metrics };
}
