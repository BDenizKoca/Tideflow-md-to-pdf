/**
 * Hook to handle content management: auto-render, typing detection, and debouncing.
 * Manages the render queue and auto-save logic.
 */

import { useCallback, useRef } from 'react';
import { renderTypst, cleanupTempPdfs } from '../api';
import type { SourceMap, SyncMode } from '../types';
import type { EditorStateRefs } from './useEditorState';
import { logger } from '../utils/logger';
import { useUIStore } from '../stores/uiStore';

// Create scoped logger
const useContentManagementLogger = logger.createScoped('useContentManagement');

/**
 * Check if error is a missing citation key error and extract the key
 */
function parseCitationError(errorMsg: string): string | null {
  // Match pattern: "error: key `something` does not exist in the bibliography"
  const match = errorMsg.match(/key `([^`]+)` does not exist in the bibliography/i);
  return match ? match[1] : null;
}

interface CompileStatus {
  status: 'running' | 'ok' | 'error';
  pdf_path?: string;
  source_map?: SourceMap;
  message?: string;
  details?: string;
}

interface UseContentManagementParams {
  editorStateRefs: EditorStateRefs;
  currentFile: string | null;
  sourceMap: SourceMap | null;
  setCompileStatus: (status: CompileStatus) => void;
  setSourceMap: (map: SourceMap | null) => void;
  setSyncMode: (mode: SyncMode) => void;
}

export function useContentManagement(params: UseContentManagementParams) {
  const {
    editorStateRefs,
    currentFile,
    sourceMap,
    setCompileStatus,
    setSourceMap,
    setSyncMode,
  } = params;

  const {
    autoRenderInFlightRef,
    pendingRenderRef,
  } = editorStateRefs;

  const addToast = useUIStore((state) => state.addToast);

  // Debounce citation warnings to prevent spam while typing
  const lastCitationWarningRef = useRef<{ key: string; timestamp: number } | null>(null);

  // Auto-render function (always full content)
  const handleAutoRender = useCallback(async (content: string, signal?: AbortSignal) => {
    try {
      // Check if operation was cancelled before starting
      if (signal?.aborted) {
        return;
      }

      if (autoRenderInFlightRef.current) {
        // A render is already in progress; remember the latest content to render afterwards.
        pendingRenderRef.current = content;
        return;
      }
      autoRenderInFlightRef.current = true;
      const wasSourceMapNull = !sourceMap;
      setCompileStatus({ status: 'running' });

      const document = await renderTypst(content, 'pdf', currentFile);

      // Check if operation was cancelled after async operation
      if (signal?.aborted) {
        return;
      }

      setSourceMap(document.sourceMap);
      setCompileStatus({
        status: 'ok',
        pdf_path: document.pdfPath,
        source_map: document.sourceMap,
      });
      // On first render that sets sourceMap, enable auto-sync so PDF follows editor
      if (wasSourceMapNull) {
        setSyncMode('auto');
      }

      // Clean up old temp PDFs after successful render
      try {
        await cleanupTempPdfs(10); // Keep last 10 temp PDFs
      } catch (err) {
        // Don't fail the render if cleanup fails
        useContentManagementLogger.warn('Failed to cleanup temp PDFs:', err);
      }
    } catch (err) {
      // Don't update state if operation was cancelled
      if (signal?.aborted) {
        return;
      }

      const errorMsg = String(err);
      const missingCitationKey = parseCitationError(errorMsg);

      // If it's a missing citation error, show a non-intrusive warning
      if (missingCitationKey) {
        // Debounce warnings: only show if different key or enough time passed (3 seconds)
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

        // Don't block the preview - keep showing the last successful render
        // Just log the warning
        useContentManagementLogger.warn(`Missing citation key: ${missingCitationKey}`);
      } else {
        // For other errors, show full error state
        setCompileStatus({
          status: 'error',
          message: 'Auto-render failed',
          details: errorMsg
        });
        setSourceMap(null);
      }
    } finally {
      autoRenderInFlightRef.current = false;
      // If there is a pending update queued during render, render once more with latest snapshot
      const pending = pendingRenderRef.current;
      pendingRenderRef.current = null;
      if (pending && !signal?.aborted) {
        // Fire-and-forget; guard will re-enter to in-flight again
        handleAutoRender(pending, signal);
      }
    }
  }, [
    currentFile,
    setCompileStatus,
    setSourceMap,
    sourceMap,
    setSyncMode,
    autoRenderInFlightRef,
    pendingRenderRef,
    addToast,
  ]);

  return {
    handleAutoRender,
  };
}

