/**
 * PDF.js Worker Initialization Utility
 * Handles worker setup and error handling for PDF.js
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfJsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { logger } from '../../utils/logger';

const workerLogger = logger.createScoped('PDFWorker');

interface PdfJsWorkerOptions {
  workerPort?: unknown;
  workerSrc?: string;
}

interface PdfJsLibWithWorker {
  GlobalWorkerOptions?: PdfJsWorkerOptions;
}

/**
 * Initialize PDF.js worker
 * This should be called once when the app starts
 */
export function initializePdfWorker(): void {
  try {
    const lib = pdfjsLib as unknown as PdfJsLibWithWorker;
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerPort && !lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = pdfJsWorkerUrl;
      workerLogger.debug('pdf.js workerSrc initialized');
    }
  } catch (outer) {
    workerLogger.warn('Worker initialization outer failure; continuing without worker', outer);
  }
}
