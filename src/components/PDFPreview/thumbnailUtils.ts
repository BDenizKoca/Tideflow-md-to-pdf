/**
 * Utility functions for PDF thumbnail generation
 */

import { logger } from '../../utils/logger';

const thumbnailLogger = logger.createScoped('thumbnails');

/**
 * Generate thumbnail images from PDF canvases
 * Returns a cleanup function to cancel pending retry timers
 */
export function generateThumbnailsFromCanvases(
  container: HTMLElement,
  onThumbnailsGenerated: (thumbnails: Map<number, string>, totalPages: number) => void,
  retryOnEmpty = true
): (() => void) | void {
  const canvases = container.querySelectorAll('canvas.pdfjs-page-canvas');

  thumbnailLogger.debug('generating thumbnails', { canvases: canvases.length });

  if (canvases.length === 0 && retryOnEmpty) {
    // Canvases are appended imperatively after render; retry once.
    thumbnailLogger.debug('no canvases yet, retrying');
    const timerId = setTimeout(() => generateThumbnailsFromCanvases(container, onThumbnailsGenerated, false), 500);
    // Return cleanup function
    return () => clearTimeout(timerId);
  }

  const newThumbnails = new Map<number, string>();
  const totalPages = canvases.length;

  canvases.forEach((canvas, index) => {
    const pageNum = index + 1;
    const sourceCanvas = canvas as HTMLCanvasElement;

    // Use the canvas's intrinsic dimensions (these are the true rendered dimensions)
    // These are independent of CSS styling and window size
    const sourceWidth = sourceCanvas.width;
    const sourceHeight = sourceCanvas.height;
    const aspectRatio = sourceHeight / sourceWidth;

    if (index === 0) {
      thumbnailLogger.debug('source canvas', {
        width: sourceWidth,
        height: sourceHeight,
        aspectRatio: aspectRatio.toFixed(3)
      });
    }

    // Create thumbnail with fixed width, height based on source aspect ratio
    const thumbnailCanvas = document.createElement('canvas');
    const targetWidth = 140;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    thumbnailCanvas.width = targetWidth;
    thumbnailCanvas.height = targetHeight;

    const ctx = thumbnailCanvas.getContext('2d', { alpha: false });
    if (ctx && sourceWidth > 0 && sourceHeight > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
      newThumbnails.set(pageNum, thumbnailCanvas.toDataURL('image/png'));
    }
  });

  thumbnailLogger.debug('generated thumbnails', { count: newThumbnails.size });

  if (newThumbnails.size > 0) {
    onThumbnailsGenerated(newThumbnails, totalPages);
  }
}

/**
 * Detect current page based on scroll position
 */
export function detectCurrentPage(container: HTMLElement): number {
  const canvases = container.querySelectorAll('canvas.pdfjs-page-canvas');
  const containerRect = container.getBoundingClientRect();
  const viewportCenter = containerRect.top + containerRect.height / 2;

  let closestPage = 1;
  let closestDistance = Infinity;

  canvases.forEach((canvas, index) => {
    const pageNum = index + 1;
    const rect = canvas.getBoundingClientRect();
    const pageCenter = rect.top + rect.height / 2;
    const distance = Math.abs(pageCenter - viewportCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestPage = pageNum;
    }
  });

  return closestPage;
}

/**
 * Scroll thumbnail list to show active page
 */
export function scrollThumbnailToActive(): void {
  const thumbnailsList = document.getElementById('thumbnails-list');
  const activeThumbnail = thumbnailsList?.querySelector('.thumbnail-item.active');

  if (activeThumbnail && thumbnailsList) {
    const thumbnailRect = activeThumbnail.getBoundingClientRect();
    const listRect = thumbnailsList.getBoundingClientRect();

    // Check if thumbnail is outside visible area
    if (thumbnailRect.top < listRect.top || thumbnailRect.bottom > listRect.bottom) {
      activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

/**
 * Scroll to a specific page
 */
export function scrollToPage(container: HTMLElement, pageNum: number): void {
  const canvases = container.querySelectorAll('canvas.pdfjs-page-canvas');
  const canvas = canvases[pageNum - 1]; // Convert to 0-indexed
  if (canvas) {
    canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
