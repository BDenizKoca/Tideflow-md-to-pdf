/**
 * Hook for file-level operations: saving, rendering, and reacting to tab
 * switches. The active file's data lives in the store; this hook owns the
 * imperative side — writing to disk, swapping CodeMirror state on tab
 * change, scheduling renders.
 */

import { useEffect, useCallback } from 'react';
import { writeMarkdownFile, renderTypst } from '../api';
import { scrubRawTypstAnchors } from '../utils/scrubAnchors';
import { handleError } from '../utils/errorHandler';
import { getScrollElement } from '../types/codemirror';
import { useEditorStore } from '../stores/editorStore';
import type { EditorStateRefs } from './useEditorState';
import { logger } from '../utils/logger';

const fileOpsLogger = logger.createScoped('FileOps');

interface UseFileOperationsParams {
  editorStateRefs: EditorStateRefs;
  /** Path of the active file, or null. */
  activeFile: string | null;
  /** Active file's text content (driven by the store, mirrored here for
   *  effect dependency tracking). */
  content: string;
  /** Active file's modified flag. */
  modified: boolean;
  /** True once CodeMirror has finished mounting. */
  editorReady: boolean;
  handleAutoRender: (content: string, signal?: AbortSignal) => Promise<void>;
  computeAnchorFromViewport: (userInitiated: boolean) => void;
}

export function useFileOperations(params: UseFileOperationsParams) {
  const {
    editorStateRefs,
    activeFile,
    content,
    modified,
    editorReady,
    handleAutoRender,
    computeAnchorFromViewport,
  } = params;

  const {
    editorViewRef,
    prevFileRef,
    programmaticScrollRef,
    swapDocumentRef,
  } = editorStateRefs;

  // Manual render — invoked from the toolbar / keyboard shortcut. Renders
  // whatever the active file currently has.
  const handleRender = useCallback(async (setPreviewVisible?: (visible: boolean) => void) => {
    const s = useEditorStore.getState();
    const path = s.activeFile;
    if (!path) return;
    const doc = s.documents[path];
    if (!doc) return;

    try {
      s.setCompileStatus(path, { status: 'running' });
      const document = await renderTypst(doc.content, 'pdf', path);
      s.setSourceMap(path, document.sourceMap);
      s.setCompileStatus(path, {
        status: 'ok',
        pdf_path: document.pdfPath,
        source_map: document.sourceMap,
      });
      if (setPreviewVisible) setPreviewVisible(true);
    } catch (err) {
      s.setCompileStatus(path, {
        status: 'error',
        message: 'Rendering failed',
        details: String(err),
      });
      s.setSourceMap(path, null);
    }
  }, []);

  // Save the active file to disk. Triggered by the Ctrl+S keymap.
  const handleSave = useCallback(async (
    setIsSaving: (saving: boolean) => void,
    addToast?: (toast: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) => void,
  ) => {
    if (!activeFile || !modified) return;

    try {
      setIsSaving(true);
      // Strip invisible raw-typst anchors before persisting so the on-disk
      // file is plain Markdown.
      const cleaned = scrubRawTypstAnchors(content);
      await writeMarkdownFile(activeFile, cleaned);
      useEditorStore.getState().markDocumentModified(activeFile, false);

      if (addToast) {
        addToast({ type: 'success', message: 'File saved successfully' });
      }

      // Re-render after save
      await handleRender();
    } catch (err) {
      if (addToast) {
        addToast({ type: 'error', message: 'Failed to save file' });
      }
      handleError(err, { operation: 'save file', component: 'Editor' });
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, modified, content, handleRender]);

  // ============================================================================
  // File-switch effect: react to activeFile changes
  // ============================================================================
  // When the user switches tabs, save the outgoing file's editor state and
  // scroll position into its FileState, then load the incoming file's
  // EditorView state via swapDocument. Per-file undo history, cursor, and
  // selection survive the switch — that's the point of storing editorState
  // on each FileState rather than dispatching a doc-replace transaction.
  useEffect(() => {
    if (!editorReady) {
      fileOpsLogger.debug('editor not ready, skipping file-switch sync');
      return;
    }
    const view = editorViewRef.current;
    if (!view) {
      fileOpsLogger.debug('no editorView, skipping file-switch sync');
      return;
    }

    const prev = prevFileRef.current;
    if (prev === activeFile) return; // no transition

    fileOpsLogger.debug('file switch', { prev, next: activeFile });

    // Save outgoing scroll position into the previous file's FileState.
    if (prev) {
      const sc = getScrollElement(view);
      if (sc) {
        useEditorStore.getState().setDocumentEditorScroll(prev, sc.scrollTop);
      }
    }

    // Update tracker BEFORE the swap so a re-render mid-swap doesn't double up.
    prevFileRef.current = activeFile;

    // Swap the EditorView state. swapDocument persists the previous file's
    // full state (cursor, selection, history) into its FileState as a side
    // effect, then loads the next file's stored state — or a fresh state
    // built from its content if the file has never been activated yet.
    if (swapDocumentRef.current) {
      swapDocumentRef.current(prev, activeFile);
    }

    if (!activeFile) return; // closed all — nothing more to do

    const targetFile = activeFile;

    // Restore the new file's editor scroll position (after layout has
    // settled from the setState swap).
    requestAnimationFrame(() => {
      // Bail if the user switched again before the rAF callback ran.
      if (useEditorStore.getState().activeFile !== targetFile) return;

      const sc = editorViewRef.current ? getScrollElement(editorViewRef.current) : null;
      if (sc) {
        const stored = useEditorStore.getState().documents[targetFile]?.editorScrollPos ?? null;
        if (stored != null) {
          programmaticScrollRef.current = true;
          sc.scrollTop = stored;
          requestAnimationFrame(() => { programmaticScrollRef.current = false; });
        }
      }

      computeAnchorFromViewport(false);

      // Always re-render on tab switch.
      //
      // We can't trust a cached "ok" compileStatus across tab switches: the
      // backend writes every PDF to a shared `build_dir/preview.pdf`, so a
      // file that compiled cleanly an hour ago has a stale on-disk PDF if
      // any other file has rendered since. Reading those bytes back into
      // the canvas would show the wrong file's content.
      //
      // We immediately flip compileStatus to 'running' so PDFViewer drops
      // the (potentially stale) cached canvas and shows the skeleton until
      // the fresh render lands. The 100ms timer debounces against an
      // in-flight typing-induced render that may still be settling.
      const after = useEditorStore.getState().documents[targetFile];
      if (after && after.content) {
        useEditorStore.getState().setCompileStatus(targetFile, { status: 'running' });
        const abortController = new AbortController();
        setTimeout(() => {
          if (useEditorStore.getState().activeFile === targetFile) {
            handleAutoRender(after.content, abortController.signal);
          }
        }, 100);
      }
    });
  }, [
    editorReady,
    activeFile,
    handleAutoRender,
    computeAnchorFromViewport,
    editorViewRef,
    prevFileRef,
    programmaticScrollRef,
    swapDocumentRef,
  ]);

  return { handleSave, handleRender };
}
