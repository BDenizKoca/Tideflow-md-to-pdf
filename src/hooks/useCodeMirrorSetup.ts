/**
 * Hook to handle CodeMirror initialization, extensions, and keyboard shortcuts.
 * Manages the editor view lifecycle and event listeners.
 */

import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';
import { search, searchKeymap, closeSearchPanel, openSearchPanel } from '@codemirror/search';
import { EditorState, StateField, Annotation, Prec, Compartment } from '@codemirror/state';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { TIMING } from '../constants/timing';
import { cmd } from '../components/commands';
import { scrubRawTypstAnchors } from '../utils/scrubAnchors';
import { getScrollElement, type ScrollElementWithHandler } from '../types/codemirror';
import { useEditorStore } from '../stores/editorStore';
import type { EditorStateRefs } from './useEditorState';
import type { EditorState as CMEditorState } from '@codemirror/state';
import { logger } from '../utils/logger';

const useCodeMirrorSetupLogger = logger.createScoped('useCodeMirrorSetup');

// ============================================================================
// Custom Annotations for Transaction Tracking
// ============================================================================

/**
 * Annotation to mark programmatic (non-user) updates to the document.
 * Used to distinguish between user edits and system updates (e.g., file loading).
 */
const programmaticUpdateAnnotation = Annotation.define<boolean>();

/**
 * Annotation to mark user typing events.
 * Used to track when user is actively typing for debouncing and auto-render.
 */
const userTypingAnnotation = Annotation.define<boolean>();

// ============================================================================
// Custom State Field for Editor-Specific State
// ============================================================================

/**
 * State field to track custom editor state like typing status.
 * This replaces the ref-based state management with proper CodeMirror state.
 */
const editorCustomState = StateField.define<{
  isTyping: boolean;
  lastUserEdit: number;
}>({
  create: () => ({
    isTyping: false,
    lastUserEdit: 0,
  }),
  update: (value, tr) => {
    // Mark as typing when user edit annotation is present
    if (tr.annotation(userTypingAnnotation)) {
      return {
        isTyping: true,
        lastUserEdit: Date.now(),
      };
    }
    // Clear typing state on programmatic updates
    if (tr.annotation(programmaticUpdateAnnotation)) {
      return {
        ...value,
        isTyping: false,
      };
    }
    return value;
  },
});

// ============================================================================
// Configuration Compartments for Dynamic Reconfiguration
// ============================================================================

/**
 * Compartment for search configuration.
 * Allows dynamic reconfiguration of search panel settings without recreating editor.
 */
const searchConfigCompartment = new Compartment();

interface UseCodeMirrorSetupParams {
  editorStateRefs: EditorStateRefs;
  content: string;
  setContent: (content: string) => void;
  setModified: (modified: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  handleSave: () => void;
  handleRender: () => void;
  handleAutoRender: (content: string, signal?: AbortSignal) => Promise<void>;
  renderDebounceMs: number;
  setupScrollListener: () => (() => void) | undefined;
  setEditorReady: (ready: boolean) => void;
}

export function useCodeMirrorSetup(params: UseCodeMirrorSetupParams) {
  const {
    editorStateRefs,
    content,
    setContent,
    setModified,
    setIsTyping,
    handleSave,
    handleRender,
    handleAutoRender,
    renderDebounceMs,
    setupScrollListener,
    setEditorReady,
  } = params;

  const {
    editorRef,
    editorViewRef,
    contentChangeTimeoutRef,
    contentChangeAbortRef,
    typingDetectionTimeoutRef,
    scrollElRef,
    isUserTypingRef,
    swapDocumentRef,
  } = editorStateRefs;

  const renderDebounceRef = useRef(renderDebounceMs);
  const contentRef = useRef(content);
  const setContentRef = useRef(setContent);
  const setModifiedRef = useRef(setModified);
  const setIsTypingRef = useRef(setIsTyping);
  const handleSaveRef = useRef(handleSave);
  const handleRenderRef = useRef(handleRender);
  const handleAutoRenderRef = useRef(handleAutoRender);
  const setupScrollListenerRef = useRef(setupScrollListener);
  const setEditorReadyRef = useRef(setEditorReady);

  useEffect(() => {
    renderDebounceRef.current = renderDebounceMs;
  }, [renderDebounceMs]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    setContentRef.current = setContent;
  }, [setContent]);

  useEffect(() => {
    setModifiedRef.current = setModified;
  }, [setModified]);

  useEffect(() => {
    setIsTypingRef.current = setIsTyping;
  }, [setIsTyping]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    handleRenderRef.current = handleRender;
  }, [handleRender]);

  useEffect(() => {
    handleAutoRenderRef.current = handleAutoRender;
  }, [handleAutoRender]);

  useEffect(() => {
    setupScrollListenerRef.current = setupScrollListener;
  }, [setupScrollListener]);

  useEffect(() => {
    setEditorReadyRef.current = setEditorReady;
  }, [setEditorReady]);

  // Track if we've initialized the editor
  const initializedRef = useRef(false);

  // Initialize CodeMirror when the component mounts (ONCE - component never unmounts now)
  useEffect(() => {
    // Only initialize once - component is persistent now
    if (initializedRef.current) return;

    // Don't create editor if we don't have an editor container yet
    if (!editorRef.current) return;

    // Don't create editor if one already exists
    if (editorViewRef.current) return;

    // Create editor even without content - it will be updated by useFileOperations
    // This is because the component is now persistent and never unmounts
    if (process.env.NODE_ENV !== 'production') {
      useCodeMirrorSetupLogger.info('Initializing editor, content length:', content.length);
    }

    initializedRef.current = true;

    // NOTE: We use CSS variables for all colors so they respond to theme changes dynamically.
    // Do NOT read and bake CSS variables into hardcoded colors - that breaks theme switching!

    // Create custom syntax highlighting using CSS variables (not hardcoded colors!)
    // We map token types to CSS classes that use our theme variables
    const markdownHighlighting = HighlightStyle.define([
      { tag: tags.heading, class: 'cm-heading' },
      { tag: tags.heading1, class: 'cm-heading1' },
      { tag: tags.heading2, class: 'cm-heading2' },
      { tag: tags.heading3, class: 'cm-heading3' },
      { tag: tags.heading4, class: 'cm-heading4' },
      { tag: tags.heading5, class: 'cm-heading5' },
      { tag: tags.heading6, class: 'cm-heading6' },
      { tag: tags.strong, class: 'cm-strong' },
      { tag: tags.emphasis, class: 'cm-em' },
      { tag: tags.link, class: 'cm-link' },
      { tag: tags.url, class: 'cm-url' },
      { tag: tags.monospace, class: 'cm-code' },
      { tag: tags.quote, class: 'cm-quote' },
      { tag: tags.meta, class: 'cm-meta' },
      { tag: tags.punctuation, class: 'cm-punctuation' },
    ]);

    // Build the extensions array once and reuse it both for initial creation
    // and for fresh EditorState instances created on file switch (so we wipe
    // undo history without losing the editor configuration).
    const extensions = [
        // ====================================================================
        // Core Extensions
        // ====================================================================
        basicSetup,
        markdown(), // Markdown language support
        EditorView.lineWrapping,

        // Custom syntax highlighting - APPLY THIS TO MAKE COLORS WORK!
        syntaxHighlighting(markdownHighlighting),

        // Custom state field for editor-specific state
        editorCustomState,

        // Search configuration (wrapped in compartment for future reconfiguration)
        searchConfigCompartment.of(search({
          top: true,
          caseSensitive: false,
        })),

        // ====================================================================
        // Theme Configuration (Using CSS Variables)
        // ====================================================================
        // Using EditorView.theme() instead of baseTheme() for higher specificity
        EditorView.theme({
          '&': {
            'background-color': 'var(--editor-bg)',
            'color': 'var(--cm-text)'
          },
          '& *': {
            'color': 'var(--cm-text)'
          },
          '.cm-content': {
            'white-space': 'pre-wrap',
            'word-wrap': 'break-word',
            'overflow-wrap': 'break-word',
            'background-color': 'var(--cm-content-bg)',
            'color': 'var(--cm-text)',
            'caret-color': 'var(--cm-cursor)'
          },
          '.cm-line': {
            'white-space': 'pre-wrap',
            'word-wrap': 'break-word',
            'overflow-wrap': 'break-word',
            'background-color': 'var(--cm-line-bg)'
          },
          '.cm-cursor, .cm-dropCursor': {
            'border-left-color': 'var(--cm-cursor)'
          },
          '.cm-selectionBackground, ::selection': {
            'background-color': 'var(--cm-selection) !important'
          },
          '&.cm-focused .cm-selectionBackground, &.cm-focused ::selection': {
            'background-color': 'var(--cm-selection) !important'
          },
          '.cm-activeLine': {
            'background-color': 'transparent'
          },
          '.cm-gutters': {
            'background-color': 'var(--cm-gutter-bg)',
            'color': 'var(--cm-gutter-text)',
            'border': 'none'
          },
          '.cm-activeLineGutter': {
            'background-color': 'transparent'
          },

          // Search panel styles using CSS variables
          '.cm-panel.cm-search': {
            'background': 'var(--search-panel-bg)',
            'border-bottom': '1px solid var(--search-panel-border)',
            'padding': '8px 12px',
            'box-shadow': 'var(--shadow-sm)',
            'color': 'var(--text-primary)'
          },
          '.cm-panel.cm-search label': {
            'color': 'var(--text-secondary)',
            'font-size': '0.85rem'
          },
          '.cm-panel.cm-search input, .cm-panel.cm-search textarea': {
            'background': 'var(--search-input-bg)',
            'border': '1px solid var(--search-input-border)',
            'border-radius': 'var(--border-radius)',
            'padding': '6px 8px',
            'font-size': '0.85rem',
            'outline': 'none',
            'color': 'var(--search-input-text)'
          },
          '.cm-panel.cm-search input::placeholder, .cm-panel.cm-search textarea::placeholder': {
            'color': 'var(--text-placeholder)'
          },
          '.cm-panel.cm-search input:focus, .cm-panel.cm-search textarea:focus': {
            'border-color': 'var(--search-input-border-focus)',
            'box-shadow': '0 0 0 2px var(--search-input-border-focus)'
          },
          '.cm-panel.cm-search button': {
            'background': 'var(--search-button-bg)',
            'border': '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            'padding': '4px 8px',
            'font-size': '0.75rem',
            'cursor': 'pointer',
            'transition': 'all var(--transition-fast)',
            'color': 'var(--search-button-text)',
            'font-weight': '500'
          },
          '.cm-panel.cm-search button:hover': {
            'background': 'var(--search-button-bg-hover)',
            'border-color': 'var(--border-color-hover)',
            'color': 'var(--text-primary)'
          },
          '.cm-panel.cm-search button[name="close"]': {
            'color': 'var(--text-tertiary)'
          },
          '.cm-panel.cm-search button[name="close"]:hover': {
            'color': '#dc2626',
            'background': 'rgba(220, 38, 38, 0.1)',
            'border-color': '#dc2626'
          },
          '.cm-search-label': {
            'color': 'var(--text-secondary)',
            'font-size': '0.75rem'
          },
          // Search matches highlighting
          '.cm-searchMatch': {
            'background-color': 'rgba(255, 215, 0, 0.3)',
            'outline': '1px solid rgba(255, 215, 0, 0.5)'
          },
          '.cm-searchMatch-selected': {
            'background-color': 'rgba(255, 165, 0, 0.4)',
            'outline': '1px solid rgba(255, 165, 0, 0.6)'
          },

        }, {dark: true}),

        // ====================================================================
        // Keyboard Shortcuts (Organized by Priority)
        // ====================================================================

        // High priority: System commands that override defaults
        Prec.high(keymap.of([
          {
            key: "Ctrl-s",
            run: () => { handleSaveRef.current(); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-r",
            run: () => { handleRenderRef.current(); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-f",
            run: (view) => {
              // Toggle search panel: if close returns false, panel wasn't open, so open it
              const closed = closeSearchPanel(view);
              if (!closed) {
                return openSearchPanel(view);
              }
              return true;
            },
            preventDefault: true
          },
          {
            key: "Escape",
            run: (view) => {
              return closeSearchPanel(view);
            }
          }
        ])),

        // Normal priority: Text formatting shortcuts
        keymap.of([
          // Text formatting
          {
            key: "Ctrl-b",
            run: (view) => { cmd.bold(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-i",
            run: (view) => { cmd.italic(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-`",
            run: (view) => { cmd.codeInline(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-k",
            run: (view) => { cmd.link(view); return true; },
            preventDefault: true
          },

          // Heading shortcuts
          {
            key: "Ctrl-Alt-1",
            run: (view) => { cmd.heading(view, 1); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-Alt-2",
            run: (view) => { cmd.heading(view, 2); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-Alt-3",
            run: (view) => { cmd.heading(view, 3); return true; },
            preventDefault: true
          },

          // List shortcuts
          {
            key: "Ctrl-Shift-8",
            run: (view) => { cmd.ul(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-Shift-7",
            run: (view) => { cmd.ol(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-Shift-9",
            run: (view) => { cmd.task(view); return true; },
            preventDefault: true
          },

          // Other formatting
          {
            key: "Ctrl-Shift-q",
            run: (view) => { cmd.quote(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-Shift-c",
            run: (view) => { cmd.codeBlock(view); return true; },
            preventDefault: true
          }
        ]),

        // Search keymap at default precedence
        keymap.of(searchKeymap),

        // Normal priority: History shortcuts
        keymap.of([
          {
            key: "Ctrl-z",
            run: (view) => { cmd.undo(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-y",
            run: (view) => { cmd.redo(view); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-Shift-z",
            run: (view) => { cmd.redo(view); return true; },
            preventDefault: true
          }
        ]),

        // Normal priority: Copy with anchor scrubbing
        keymap.of([
          {
            key: "Mod-c",
            run: (view) => {
              const state = view.state;
              const selection = state.selection.main;
              const text = selection.empty ? state.doc.toString() : state.sliceDoc(selection.from, selection.to);
              const scrubbed = scrubRawTypstAnchors(text);
              navigator.clipboard.writeText(scrubbed);
              return true;
            }
          }
        ]),

        // ====================================================================
        // Update Listener with Optimized State Management
        // ====================================================================
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            // Treat as programmatic if either:
            //  - a transaction is annotated as programmatic (legacy callers
            //    that still use dispatch + programmaticUpdateAnnotation), or
            //  - the update came from view.setState (no transactions array
            //    entries) — that's our file-switch swap.
            const isProgrammatic =
              update.transactions.length === 0 ||
              update.transactions.some(tr => tr.annotation(programmaticUpdateAnnotation));

            // Skip marking as modified if this is a programmatic update
            if (isProgrammatic) {
              // Use requestMeasure for DOM-related work
              update.view.requestMeasure({
                read: () => update.state.doc.toString(),
                write: (newContent) => {
                  setContentRef.current(newContent);
                }
              });
              return;
            }

            // This is a user edit - mark as typing and modified
            isUserTypingRef.current = true;
            setIsTypingRef.current(true);

            // Use requestMeasure for state updates
            update.view.requestMeasure({
              read: () => update.state.doc.toString(),
              write: (newContent) => {
                setContentRef.current(newContent);
                setModifiedRef.current(true);
              }
            });

            // Clear existing timeouts
            if (contentChangeTimeoutRef.current) {
              clearTimeout(contentChangeTimeoutRef.current);
            }
            if (typingDetectionTimeoutRef.current) {
              clearTimeout(typingDetectionTimeoutRef.current);
            }

            // Typing detection timeout (longer to avoid inter-keystroke sync)
            typingDetectionTimeoutRef.current = setTimeout(() => {
              setIsTypingRef.current(false);
            }, TIMING.TYPING_IDLE_THRESHOLD_MS);

            // Smart trailing-only debounced render: one render after the last change
            const newContent = update.state.doc.toString();
            const abortController = new AbortController();
            contentChangeAbortRef.current = abortController;
            contentChangeTimeoutRef.current = setTimeout(() => {
              handleAutoRenderRef.current(newContent, abortController.signal);
              isUserTypingRef.current = false;
            }, renderDebounceRef.current);
          }
        }), // Close the updateListener.of() call
    ];

    const view = new EditorView({
      // Use the live ref so we pick up whatever content was loaded by the
      // file-switch effect, even if it landed before this effect ran.
      // (Initial render before any file load is fine — empty doc; the
      // file-switch effect dispatches the real content shortly after.)
      state: EditorState.create({
        doc: contentRef.current,
        extensions,
      }),
      parent: editorRef.current!
    });

    editorViewRef.current = view;

    // Expose a function that callers (file-switch effect) use to swap the
    // displayed document. We save the outgoing file's full EditorState into
    // its FileState (preserving cursor / selection / undo history) and load
    // the incoming file's stored EditorState — or a fresh one from its
    // content if it's never been activated before. Each file therefore
    // keeps its own isolated history; Ctrl+Z on file B can't revert an
    // edit made on file A.
    swapDocumentRef.current = (prevPath, nextPath) => {
      const store = useEditorStore.getState();

      if (prevPath) {
        // Persist the outgoing file's full editor state. This is a
        // non-serializable snapshot (lives only in memory) but it's a
        // first-class store value so unrelated effects don't lose track
        // of it.
        store.setDocumentEditorState(prevPath, view.state);
      }

      if (!nextPath) {
        // No active file (e.g. Close All). Render an empty editor so the
        // viewport is clean.
        view.setState(EditorState.create({ doc: '', extensions, selection: { anchor: 0 } }));
        return;
      }

      const nextDoc = store.documents[nextPath];
      if (!nextDoc) return; // unknown path — leave editor unchanged

      const restored = nextDoc.editorState as CMEditorState | null;
      if (restored) {
        view.setState(restored);
      } else {
        view.setState(EditorState.create({
          doc: nextDoc.content,
          extensions,
          selection: { anchor: 0 },
        }));
      }
    };

    // Signal that editor is ready
    setEditorReadyRef.current(true);

    // Add scroll listener to compute active anchor based on viewport
    const scrollEl = getScrollElement(view);
    if (scrollEl) {
      scrollElRef.current = scrollEl;
      const cleanup = setupScrollListenerRef.current();
      if (cleanup) {
        (scrollEl as ScrollElementWithHandler)._tideflowScrollHandler = cleanup;
      }
    }

    return () => {
      // Capture refs locally
      const timeoutId = contentChangeTimeoutRef.current;
      const abortController = contentChangeAbortRef.current;
      const typingId = typingDetectionTimeoutRef.current;

      if (editorViewRef.current) {
        // Remove scroll listener before destroy
        try {
          const scrollEl = scrollElRef.current;
          if (scrollEl && (scrollEl as ScrollElementWithHandler)._tideflowScrollHandler) {
            const handler = (scrollEl as ScrollElementWithHandler)._tideflowScrollHandler;
            if (typeof handler === 'function') {
              handler();
            }
            delete (scrollEl as ScrollElementWithHandler)._tideflowScrollHandler;
          }
        } catch { /* ignore */ }
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
      if (timeoutId) clearTimeout(timeoutId);
      if (abortController) abortController.abort();
      if (typingId) clearTimeout(typingId);

      // Reset initialization flag so editor can be recreated on remount
      initializedRef.current = false;
      swapDocumentRef.current = null;
    };
  // Run only once when component mounts - component is now persistent.
  // Live refs keep callbacks fresh without recreating the editor instance.
  // `content` was previously in this dep array, which made the effect re-run
  // on every tab switch (setContent fires) and tear down + recreate CodeMirror
  // — defeating the persistent-component design. We read content from
  // contentRef.current instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ============================================================================
// Exported Utilities
// ============================================================================

/**
 * Export the programmatic update annotation for use in other hooks.
 * This allows other parts of the codebase to mark their dispatches as programmatic.
 */
export { programmaticUpdateAnnotation };

/**
 * Helper function to create a programmatic dispatch spec.
 * Use this when programmatically updating the editor to mark it as non-user change.
 */
export function createProgrammaticDispatch(changes: unknown, additionalSpec: Record<string, unknown> = {}) {
  return {
    changes,
    annotations: programmaticUpdateAnnotation.of(true),
    ...additionalSpec
  };
}
