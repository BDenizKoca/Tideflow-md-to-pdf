/**
 * Selector hooks that read state for the currently active file.
 *
 * Components subscribe to the slice they actually need — useActiveContent
 * only re-renders on content changes, useActiveCompileStatus only on compile
 * status changes, etc. — instead of pulling the whole document and
 * re-rendering on every per-file change.
 *
 * For non-reactive reads (inside callbacks, async resolves), use
 * useEditorStore.getState() and walk documents/activeFile by hand.
 */

import { useEditorStore } from '../stores/editorStore';
import type { CompileStatus, FileState, SourceMap } from '../types';

// Stable sentinel for the "no file open" / "no compile status yet" case.
// Allocating `{status:'idle'}` inside the selector would return a fresh
// object on every store change — Zustand uses Object.is to detect changes,
// so each subscriber would re-render on any unrelated store update, and
// effects keyed on compileStatus would fire in a loop.
const IDLE_STATUS: CompileStatus = { status: 'idle' };

/** The full FileState for the active file, or null if no file is open. */
export function useActiveDocument(): FileState | null {
  return useEditorStore((s) =>
    s.activeFile ? (s.documents[s.activeFile] ?? null) : null,
  );
}

/** Active file path, or null. Same as `state.activeFile` directly. */
export function useActiveFile(): string | null {
  return useEditorStore((s) => s.activeFile);
}

/** Active file's text content, or '' if no file is open. */
export function useActiveContent(): string {
  return useEditorStore((s) =>
    s.activeFile ? (s.documents[s.activeFile]?.content ?? '') : '',
  );
}

/** Whether the active file has unsaved edits. */
export function useActiveModified(): boolean {
  return useEditorStore((s) =>
    s.activeFile ? (s.documents[s.activeFile]?.modified ?? false) : false,
  );
}

/** Compile status of the active file (idle if none). */
export function useActiveCompileStatus(): CompileStatus {
  return useEditorStore((s) => {
    const path = s.activeFile;
    return path
      ? (s.documents[path]?.compileStatus ?? IDLE_STATUS)
      : IDLE_STATUS;
  });
}

/** Source map of the active file, or null. */
export function useActiveSourceMap(): SourceMap | null {
  return useEditorStore((s) =>
    s.activeFile ? (s.documents[s.activeFile]?.sourceMap ?? null) : null,
  );
}

/** Active anchor ID for the active file, or null. */
export function useActiveAnchorId(): string | null {
  return useEditorStore((s) =>
    s.activeFile ? (s.documents[s.activeFile]?.activeAnchorId ?? null) : null,
  );
}

/**
 * Non-reactive helpers for use inside callbacks. They don't subscribe — call
 * them only from event handlers, async resolves, refs, or other places where
 * a re-render isn't appropriate.
 */
export function getActiveDocument(): FileState | null {
  const s = useEditorStore.getState();
  return s.activeFile ? (s.documents[s.activeFile] ?? null) : null;
}

export function getDocument(path: string | null | undefined): FileState | null {
  if (!path) return null;
  return useEditorStore.getState().documents[path] ?? null;
}
