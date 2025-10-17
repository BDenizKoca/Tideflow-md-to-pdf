/**
 * PDF.js Worker Initialization Utility
 * Handles worker setup and error handling for PDF.js
 */

import * as pdfjsLib from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
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
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerPort) {
      try {
        // Worker constructor requires dynamic instantiation
        lib.GlobalWorkerOptions.workerPort = new (PdfJsWorker as unknown as new () => Worker)();
        workerLogger.debug('pdf.js workerPort initialized');
      } catch (inner) {
        workerLogger.warn('Worker construction failed, continuing with fake worker', inner);
      }
    }
  } catch (outer) {
    workerLogger.warn('Worker initialization outer failure; continuing without worker', outer);
  }
}
