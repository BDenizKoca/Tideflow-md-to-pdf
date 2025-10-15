/**
 * Hook to handle file operations: saving, rendering, file switching, content loading.
 * Manages scroll position restoration and document lifecycle.
 */

import { useEffect, useCallback, useRef } from 'react';
import { writeMarkdownFile, renderTypst } from '../api';
import { scrubRawTypstAnchors } from '../utils/scrubAnchors';
import { handleError } from '../utils/errorHandler';
import { getScrollElement } from '../types/codemirror';
import { programmaticUpdateAnnotation } from './useCodeMirrorSetup';
import type { SourceMap } from '../types';
import type { EditorStateRefs } from './useEditorState';
import { logger } from '../utils/logger';

// Create scoped logger
const fileOpsLogger = logger.createScoped('FileOps');

interface CompileStatus {
  status: 'running' | 'ok' | 'error';
  pdf_path?: string;
  source_map?: SourceMap;
  message?: string;
  details?: string;
}

interface UseFileOperationsParams {
  editorStateRefs: EditorStateRefs;
  currentFile: string | null;
  content: string;
  modified: boolean;
  sourceMap: SourceMap | null;
  editorReady: boolean;
  setModified: (modified: boolean) => void;
  setCompileStatus: (status: CompileStatus) => void;
  setSourceMap: (map: SourceMap | null) => void;
  setEditorScrollPosition: (file: string, position: number) => void;
  getEditorScrollPosition: (file: string) => number | null;
  handleAutoRender: (content: string, signal?: AbortSignal) => Promise<void>;
  computeAnchorFromViewport: (userInitiated: boolean) => void;
}

export function useFileOperations(params: UseFileOperationsParams) {
  const {
    editorStateRefs,
    currentFile,
    content,
    modified,
    sourceMap,
    editorReady,
    setModified,
    setCompileStatus,
    setSourceMap,
    setEditorScrollPosition,
    getEditorScrollPosition,
    handleAutoRender,
    computeAnchorFromViewport,
  } = params;

  const {
    editorViewRef,
    prevFileRef,
    lastLoadedContentRef,
    programmaticScrollRef,
    programmaticUpdateRef,
  } = editorStateRefs;

  // Handle render
  const handleRender = useCallback(async (setPreviewVisible?: (visible: boolean) => void) => {
    try {
      setCompileStatus({ status: 'running' });
      const document = await renderTypst(content, 'pdf', currentFile);
      setSourceMap(document.sourceMap);
      setCompileStatus({
        status: 'ok',
        pdf_path: document.pdfPath,
        source_map: document.sourceMap,
      });
      // Show preview if it's hidden
      if (setPreviewVisible) {
        setPreviewVisible(true);
      }
    } catch (err) {
      setCompileStatus({
        status: 'error',
        message: 'Rendering failed',
        details: String(err)
      });
      setSourceMap(null);
    }
  }, [content, currentFile, setCompileStatus, setSourceMap]);

  // Save the file
  const handleSave = useCallback(async (setIsSaving: (saving: boolean) => void, addToast?: (toast: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) => void) => {
    if (!currentFile || !modified) return;

    try {
      setIsSaving(true);
      // Strip invisible raw-typst anchors before saving so the persisted
      // markdown doesn't contain those injected tokens which can interfere
      // with copy/paste and other tooling.
      const cleaned = scrubRawTypstAnchors(content);
      await writeMarkdownFile(currentFile, cleaned);
      setModified(false);

      // Show success toast
      if (addToast) {
        addToast({ type: 'success', message: 'File saved successfully' });
      }

      // After saving, render the file
      await handleRender();
    } catch (err) {
      // Show error toast
      if (addToast) {
        addToast({ type: 'error', message: 'Failed to save file' });
      }
      handleError(err, { operation: 'save file', component: 'Editor' });
    } finally {
      setIsSaving(false);
    }
  }, [currentFile, modified, content, setModified, handleRender]);

  // Load file content ONLY when switching to a different file, not on every keystroke.
  // Use generation tracking to prevent race conditions on rapid file switches.
  useEffect(() => {
    // Wait until CodeMirror/editor is initialized before attempting content sync.
    if (!editorReady) {
      fileOpsLogger.debug('Editor not ready, skipping content sync');
      return;
    }
    if (!editorViewRef.current) {
      fileOpsLogger.debug('No editorView, skipping content sync');
      return;
    }
    if (!currentFile) {
      fileOpsLogger.debug('No currentFile, skipping content sync');
      return; // No file selected
    }

    // When a new file is selected (including when going from no files to first file)
    if (currentFile !== prevFileRef.current) {
      fileOpsLogger.debug('File changed, syncing content', { currentFile, prevFile: prevFileRef.current, contentLength: content.length });
      // Track the target file to detect if user switches away during loading
      const targetFile = currentFile;

      // Save current scroll position for the previous file before switching
      if (prevFileRef.current) {
        const sc = getScrollElement(editorViewRef.current);
        if (sc) {
          const pos = sc.scrollTop;
          setEditorScrollPosition(prevFileRef.current, pos);
          fileOpsLogger.debug('saved scroll pos on file switch', { file: prevFileRef.current, pos });
        }
      }

      // Update tracking refs immediately to prevent double-processing
      prevFileRef.current = currentFile;
      lastLoadedContentRef.current = content;

      // Replace document content with the file's content
      // Mark as programmatic update using annotation
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: content
        },
        selection: { anchor: 0, head: 0 }, // Set cursor to top to prevent auto-scroll
        annotations: programmaticUpdateAnnotation.of(true)
      });

      // Restore scroll position after content is loaded (async to avoid race)
      requestAnimationFrame(() => {
        // Verify we're still on the same file (user might have switched again)
        if (currentFile !== targetFile) {
          fileOpsLogger.debug('skipped scroll restore - file changed', { targetFile, currentFile });
          return;
        }

        try {
          const stored = getEditorScrollPosition(targetFile);
          if (stored !== null && editorViewRef.current) {
            const sc = getScrollElement(editorViewRef.current);
            if (sc) {
              programmaticScrollRef.current = true;
              sc.scrollTop = stored;
              requestAnimationFrame(() => { programmaticScrollRef.current = false; });
              fileOpsLogger.debug('restored scroll pos', { file: targetFile, pos: stored });
            }
          }
        } catch { /* ignore */ }

        // Compute anchor and auto-render (only if still on same file)
        if (currentFile === targetFile) {
          computeAnchorFromViewport(false);
          // Debounce auto-render on file switch to avoid race with content loading
          const abortController = new AbortController();
          const timerId = setTimeout(() => {
            if (currentFile === targetFile) {
              handleAutoRender(content, abortController.signal);
            }
          }, 100);

          // Cleanup: cancel render if component unmounts or file changes
          return () => {
            clearTimeout(timerId);
            abortController.abort();
          };
        }
      });
    }
  }, [
    editorReady,
    currentFile,
    content,
    handleAutoRender,
    setEditorScrollPosition,
    getEditorScrollPosition,
    computeAnchorFromViewport,
  ]);

  // If content in store changes for current file (e.g., loaded asynchronously) and differs from editor doc, update it.
  // This effect is now safer as it only runs when content genuinely changes for the CURRENT file.
  useEffect(() => {
    if (!editorViewRef.current) return;
    if (!currentFile) return;

    // Only update if this content is for the currently displayed file
    if (currentFile !== prevFileRef.current) return;

    const currentDoc = editorViewRef.current.state.doc.toString();
    if (content !== currentDoc && content !== lastLoadedContentRef.current) {
      // Mark as programmatic update using annotation
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: content
        },
        annotations: programmaticUpdateAnnotation.of(true)
      });
      lastLoadedContentRef.current = content;
    }
  }, [content, currentFile, editorViewRef, prevFileRef, lastLoadedContentRef, programmaticUpdateRef]);

  // Initial render on startup: trigger auto-render when editor is ready with content but no PDF yet
  // This handles the case where the app starts with a file already loaded from session
  const initialRenderAttemptedRef = useRef(false);

  useEffect(() => {
    fileOpsLogger.debug('startup render effect fired', {
      attempted: initialRenderAttemptedRef.current,
      editorReady,
      hasFile: !!currentFile,
      hasContent: !!content,
      hasSourceMap: !!sourceMap,
    });

    // Only attempt initial render once per mount
    if (initialRenderAttemptedRef.current) {
      fileOpsLogger.debug('startup render already attempted, skipping');
      return;
    }

    // Wait for editor to be ready
    if (!editorReady) {
      fileOpsLogger.debug('startup render waiting for editor ready');
      return;
    }
    if (!currentFile) {
      fileOpsLogger.debug('startup render waiting for file');
      return;
    }
    if (!content) {
      fileOpsLogger.debug('startup render waiting for content');
      return;
    }

    // Don't render if we already have a PDF
    if (sourceMap) {
      fileOpsLogger.debug('startup render skipped - sourceMap already exists');
      initialRenderAttemptedRef.current = true;
      return;
    }

    // Mark that we've attempted
    initialRenderAttemptedRef.current = true;

    // At this point: editor is ready, file is open, has content, but no PDF rendered yet
    fileOpsLogger.debug('startup render triggered', { file: currentFile, contentLength: content.length });

    const timerId = setTimeout(() => {
      fileOpsLogger.debug('executing startup render NOW');
      handleAutoRender(content);
    }, 500); // Longer delay to ensure everything is initialized

    return () => clearTimeout(timerId);
  }, [editorReady, currentFile, content, sourceMap, handleAutoRender]);

  return {
    handleSave,
    handleRender,
  };
}
