/**
 * Auto-render management. Owns the debounced render queue that fires when
 * the user types: kicks off a Typst compile, threads the result back to
 * the right document, and folds intermediate updates into a single trailing
 * render.
 *
 * Per-document state (compileStatus, sourceMap) is updated keyed by path,
 * read fresh from the store at each call boundary — no stale closures.
 */

import { useCallback, useRef } from 'react';
import { renderTypst, cleanupTempPdfs } from '../api';
import type { EditorStateRefs } from './useEditorState';
import { logger } from '../utils/logger';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';

const useContentManagementLogger = logger.createScoped('useContentManagement');

/** Match the backend's "key `foo` does not exist in the bibliography" error
 *  and return the offending key, or null if the message is some other error. */
function parseCitationError(errorMsg: string): string | null {
  const match = errorMsg.match(/key `([^`]+)` does not exist in the bibliography/i);
  return match ? match[1] : null;
}

interface UseContentManagementParams {
  editorStateRefs: EditorStateRefs;
}

export function useContentManagement(params: UseContentManagementParams) {
  const { editorStateRefs } = params;
  const { autoRenderInFlightRef, pendingRenderRef } = editorStateRefs;

  const addToast = useUIStore((state) => state.addToast);

  // Debounce citation warnings to prevent spam while typing
  const lastCitationWarningRef = useRef<{ key: string; timestamp: number } | null>(null);

  // Auto-render. Stable identity — reads everything it needs from the store
  // at call time, so callbacks captured by CodeMirror don't go stale on tab
  // switch.
  const handleAutoRender = useCallback(async (content: string, signal?: AbortSignal) => {
    if (signal?.aborted) return;

    if (autoRenderInFlightRef.current) {
      // A render is already in flight. Remember the latest content; we'll
      // re-fire once the current render completes.
      pendingRenderRef.current = content;
      return;
    }

    // Snapshot which file this render is for. If the user switches tabs
    // mid-render, our state writes go to *this* document, not the new
    // active one. The renderTypst call also passes this path so the
    // backend resolves images relative to the right file.
    const path = useEditorStore.getState().activeFile;
    if (!path) return;

    autoRenderInFlightRef.current = true;
    const wasSourceMapNull = !useEditorStore.getState().documents[path]?.sourceMap;
    useEditorStore.getState().setCompileStatus(path, { status: 'running' });

    try {
      const document = await renderTypst(content, 'pdf', path);

      if (signal?.aborted) return;

      const s = useEditorStore.getState();
      s.setSourceMap(path, document.sourceMap);
      s.setCompileStatus(path, {
        status: 'ok',
        pdf_path: document.pdfPath,
        source_map: document.sourceMap,
      });
      // First successful render of this file enables auto-sync so the PDF
      // follows the editor cursor by default.
      if (wasSourceMapNull) {
        s.setSyncMode('auto');
      }

      // Tidy up old temp PDFs (best-effort)
      try {
        await cleanupTempPdfs(10);
      } catch (err) {
        useContentManagementLogger.warn('Failed to cleanup temp PDFs:', err);
      }
    } catch (err) {
      if (signal?.aborted) return;

      const errorMsg = String(err);
      const missingCitationKey = parseCitationError(errorMsg);

      if (missingCitationKey) {
        // Citation errors are non-fatal — keep the last successful render
        // visible and surface a debounced toast so the user sees what's
        // missing without blocking writing.
        const now = Date.now();
        const lastWarning = lastCitationWarningRef.current;
        const shouldShowWarning =
          !lastWarning ||
          lastWarning.key !== missingCitationKey ||
          now - lastWarning.timestamp > 3000;

        if (shouldShowWarning) {
          lastCitationWarningRef.current = { key: missingCitationKey, timestamp: now };
          addToast({
            type: 'warning',
            message: `Citation key '${missingCitationKey}' not found in bibliography`,
            duration: 4000,
          });
        }

        useContentManagementLogger.warn(`Missing citation key: ${missingCitationKey}`);
      } else {
        // Hard error — surface to the user via compileStatus.
        const s = useEditorStore.getState();
        s.setCompileStatus(path, {
          status: 'error',
          message: 'Auto-render failed',
          details: errorMsg,
        });
        s.setSourceMap(path, null);
      }
    } finally {
      autoRenderInFlightRef.current = false;
      // If new content arrived while we were rendering, fire the most
      // recent snapshot. The recursive call hits the in-flight guard
      // above and re-enters cleanly.
      const pending = pendingRenderRef.current;
      pendingRenderRef.current = null;
      if (pending && !signal?.aborted) {
        handleAutoRender(pending, signal);
      }
    }
  }, [autoRenderInFlightRef, pendingRenderRef, addToast]);

  return { handleAutoRender };
}
