import type { SourceMap } from '../types';
import type * as pdfjsLib from 'pdfjs-dist';
import { LAYOUT } from '../constants/timing';

export interface ComputeResult {
  offsets: Map<string, number>;
  samples: Array<{ id: string; hasPdf: boolean; metricPage?: number | undefined; offset?: number }>; 
}

/**
 * Compute anchor offsets from pdf metrics and a sourceMap.
 * Returns a Map of anchorId -> offset (px) and a small sample for logging.
 */
export function computeAnchorOffsets(metrics: { page: number; height: number; scale: number }[], map: SourceMap | null): ComputeResult {
  const offsets = new Map<string, number>();
  const samplesForLog: Array<{ id: string; hasPdf: boolean; metricPage?: number | undefined; offset?: number }> = [];
  if (!map || metrics.length === 0) return { offsets, samples: samplesForLog };

  const sorted = [...metrics].sort((a, b) => a.page - b.page);
  const pageOffsets = new Map<number, number>();
  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    const metric = sorted[i];
    pageOffsets.set(metric.page, cumulative);
    cumulative += metric.height;
    // Add gap between pages (but not after last page)
    if (i < sorted.length - 1) {
      cumulative += LAYOUT.PAGE_GAP_PX;
    }
  }

  let idx = 0;
  for (const anchor of map.anchors) {
    const pdf = anchor.pdf;
    const hasPdf = !!pdf;
    const metric = pdf ? sorted.find((m) => m.page === pdf.page) : undefined;
    if (!pdf || !metric) {
      if (idx < 5) samplesForLog.push({ id: anchor.id, hasPdf, metricPage: metric?.page });
      
      // FALLBACK: If no PDF position, create a proportional offset based on anchor index
      if (!pdf && sorted.length > 0) {
        const totalHeight = sorted.reduce((sum, m) => sum + m.height, 0);
        const proportionalOffset = (idx / Math.max(1, map.anchors.length - 1)) * totalHeight;
        offsets.set(anchor.id, Math.round(proportionalOffset));
        if (idx < 5) samplesForLog.push({ id: anchor.id, hasPdf: false, offset: Math.round(proportionalOffset) });
      }
      
      idx++;
      continue;
    }
    const pageTop = pageOffsets.get(pdf.page) ?? 0;
    const yPx = pdf.y * metric.scale;
    const offset = pageTop + yPx;
    offsets.set(anchor.id, offset);
    if (idx < 5) samplesForLog.push({ id: anchor.id, hasPdf, metricPage: metric.page, offset });
    idx++;
  }

  return { offsets, samples: samplesForLog };
}

export interface PageMetric { page: number; height: number; scale: number }

/**
 * Compute fallback anchor offsets by distributing anchors proportionally
 * across the available scroll space. Used when precise PDF positions unavailable.
 * 
 * @param anchors - Array of anchors to position
 * @param scrollHeight - Total scrollable height
 * @param clientHeight - Visible viewport height
 * @returns Map of anchorId -> pixel offset
 */
export function computeFallbackOffsets(
  anchors: Array<{ id: string }>,
  scrollHeight: number,
  clientHeight: number
): Map<string, number> {
  const available = Math.max(0, scrollHeight - clientHeight);
  const fallback = new Map<string, number>();
  
  for (let i = 0; i < anchors.length; i++) {
    // Distribute evenly from start to end
    const fraction = anchors.length > 1 ? i / (anchors.length - 1) : 0;
    let position = Math.round(fraction * available);
    
    // Avoid positions too close to zero for better UX (users can still see content)
    if (available > 100 && position < LAYOUT.MIN_POSITION_OFFSET_PX) {
      position = LAYOUT.MIN_POSITION_OFFSET_PX;
    }
    
    fallback.set(anchors[i].id, position);
  }
  
  return fallback;
}

/** Extract anchor positions by scanning PDF text content. Returns Map of
 * anchorId -> pixel offset. If extraction fails or none found, returns empty Map.
 */
export async function extractOffsetsFromPdfText(doc: pdfjsLib.PDFDocumentProxy, metrics: PageMetric[], anchors: { id: string }[], renderScale = 1.0): Promise<Map<string, number>> {
  const extracted = new Map<string, number>();
  const pageOffsets = new Map<number, number>();
  let cum = 0;
  for (const m of metrics) { pageOffsets.set(m.page, cum); cum += m.height; }
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });
    const textContent = await page.getTextContent();
    type PdfTextItem = { str?: string; transform?: number[] };
    const items = textContent.items as PdfTextItem[];
    for (const item of items) {
      const str = item.str as string | undefined;
      if (!str) continue;
      for (const anchor of anchors) {
        if (extracted.has(anchor.id)) continue;
        if (str.indexOf(anchor.id) !== -1) {
          const tx = (item.transform && item.transform[4]) ?? 0;
          const ty = (item.transform && item.transform[5]) ?? 0;
          let vy = ty;
          type ViewportLike = { scale?: number; convertToViewportPoint?: (x: number, y: number) => [number, number] };
          const vp = viewport as unknown as ViewportLike;
          if (vp && typeof vp.convertToViewportPoint === 'function') {
            try { vy = vp.convertToViewportPoint(tx, ty)[1]; } catch { vy = ty * (vp?.scale ?? 1); }
          } else { vy = ty * (vp?.scale ?? 1); }
          const pageTop = pageOffsets.get(pageNum) ?? 0;
          const offset = Math.round(pageTop + vy);
          extracted.set(anchor.id, offset);
        }
      }
    }
  }
  return extracted;
}
