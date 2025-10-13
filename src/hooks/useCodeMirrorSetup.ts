/**
 * Hook to handle CodeMirror initialization, extensions, and keyboard shortcuts.
 * Manages the editor view lifecycle and event listeners.
 */

import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';
import { search, searchKeymap, closeSearchPanel, openSearchPanel } from '@codemirror/search';
import { StateField, Annotation, Prec, Compartment } from '@codemirror/state';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { TIMING } from '../constants/timing';
import { cmd } from '../components/commands';
import { scrubRawTypstAnchors } from '../utils/scrubAnchors';
import { getScrollElement, type ScrollElementWithHandler } from '../types/codemirror';
import type { EditorStateRefs } from './useEditorState';
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
  } = editorStateRefs;

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

    const rootStyles = typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement)
      : undefined;
    const resolveVar = (name: string, fallback: string) => {
      if (!rootStyles) return fallback;
      const value = rootStyles.getPropertyValue(name).trim();
      return value.length > 0 ? value : fallback;
    };

    const baseTextColor = resolveVar('--cm-text', '#e2e8f0');
    const headingColor = resolveVar('--cm-heading-color', resolveVar('--primary-color', '#60a5fa'));
    const strongColor = resolveVar('--cm-strong-color', baseTextColor);
    const linkColor = resolveVar('--cm-link-color', resolveVar('--link-color', '#60a5fa'));
    const urlColor = resolveVar('--cm-url-color', resolveVar('--info-color', '#a78bfa'));
    const codeColor = resolveVar('--cm-code-color', resolveVar('--warning-color', '#fbbf24'));
    const listColor = baseTextColor;
    const quoteColor = resolveVar('--cm-quote-color', resolveVar('--text-secondary', '#cbd5e1'));
    const punctuationColor = resolveVar('--cm-punctuation-color', resolveVar('--info-color', '#60a5fa'));

    // Create custom syntax highlighting that adapts to the active UI theme
    const markdownHighlighting = HighlightStyle.define([
      { tag: tags.standard(tags.content), color: `${baseTextColor} !important` },
      { tag: tags.heading, color: `${headingColor} !important`, fontWeight: 'bold' },
      { tag: tags.strong, color: `${strongColor} !important`, fontWeight: 'bold' },
      { tag: tags.emphasis, color: `${strongColor} !important`, fontStyle: 'italic' },
      { tag: tags.link, color: `${linkColor} !important` },
      { tag: tags.url, color: `${urlColor} !important` },
      { tag: tags.monospace, color: `${codeColor} !important` },
      { tag: tags.list, color: `${listColor} !important` },
      { tag: tags.quote, color: `${quoteColor} !important`, fontStyle: 'italic' },
      { tag: tags.contentSeparator, color: `${punctuationColor} !important` },
      { tag: tags.processingInstruction, color: `${punctuationColor} !important` },
      { tag: tags.punctuation, color: `${punctuationColor} !important` },
      { tag: tags.meta, color: `${punctuationColor} !important` },
      { tag: tags.bracket, color: `${punctuationColor} !important` },
      { tag: tags.brace, color: `${punctuationColor} !important` },
    ], { all: { color: baseTextColor } });

    const view = new EditorView({
      doc: content,
      extensions: [
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
            'color': baseTextColor
          },
          '& *': {
            'color': baseTextColor
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
            run: () => { handleSave(); return true; },
            preventDefault: true
          },
          {
            key: "Ctrl-r",
            run: () => { handleRender(); return true; },
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
            // Check if this is a programmatic update (e.g., file loading)
            const isProgrammatic = update.transactions.some(
              tr => tr.annotation(programmaticUpdateAnnotation)
            );

            // Skip marking as modified if this is a programmatic update
            if (isProgrammatic) {
              // Use requestMeasure for DOM-related work
              update.view.requestMeasure({
                read: () => update.state.doc.toString(),
                write: (newContent) => {
                  setContent(newContent);
                }
              });
              return;
            }

            // This is a user edit - mark as typing and modified
            isUserTypingRef.current = true;
            setIsTyping(true);

            // Use requestMeasure for state updates
            update.view.requestMeasure({
              read: () => update.state.doc.toString(),
              write: (newContent) => {
                setContent(newContent);
                setModified(true);
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
              setIsTyping(false);
            }, TIMING.TYPING_IDLE_THRESHOLD_MS);

            // Smart trailing-only debounced render: one render after the last change
            const newContent = update.state.doc.toString();
            const abortController = new AbortController();
            contentChangeAbortRef.current = abortController;
            contentChangeTimeoutRef.current = setTimeout(() => {
              handleAutoRender(newContent, abortController.signal);
              isUserTypingRef.current = false;
            }, renderDebounceMs);
          }
        }), // Close the updateListener.of() call
      ],
      parent: editorRef.current!
    });

    editorViewRef.current = view;

    // If content prop has a value, ensure editor is initialized with it
    // This handles race conditions where content updates after mount
    if (content && content !== view.state.doc.toString()) {
      if (process.env.NODE_ENV !== 'production') {
        useCodeMirrorSetupLogger.info('Content mismatch after creation, updating. Content length:', content.length);
      }
      // Use annotation to mark as programmatic update
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content
        },
        annotations: programmaticUpdateAnnotation.of(true)
      });
    }

    // Signal that editor is ready
    setEditorReady(true);

    // Add scroll listener to compute active anchor based on viewport
    const scrollEl = getScrollElement(view);
    if (scrollEl) {
      scrollElRef.current = scrollEl;
      const cleanup = setupScrollListener();
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
    };
  // Run only once when component mounts - component is now persistent
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
