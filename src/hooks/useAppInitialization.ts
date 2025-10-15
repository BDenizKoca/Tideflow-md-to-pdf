/**
 * Hook to handle app initialization logic
 * Extracted from App.tsx to improve code organization
 */

import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { getPreferences, listenForFileChanges, readMarkdownFile } from '../api';
import { loadSession } from '../utils/session';
import { initErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { INSTRUCTIONS_DOC } from '../instructionsDoc';
import type { BackendRenderedDocument, Preferences } from '../types';
import { TIMING } from '../constants/timing';

const initLogger = logger.createScoped('AppInit');

export function useAppInitialization() {
  useEffect(() => {
    const unsubscribes: UnlistenFn[] = [];
    let disposed = false;

    const register = (unlisten: UnlistenFn) => {
      if (disposed) {
        try {
          unlisten();
        } catch {
          // ignore cleanup failures for registrations that resolve after teardown
        }
      } else {
        unsubscribes.push(unlisten);
      }
    };

    const init = async () => {
      try {
        initLogger.info('init start');
        const session = loadSession();
        const editorStore = useEditorStore.getState();
        const uiStore = useUIStore.getState();
        const preferencesStore = usePreferencesStore.getState();

        // Initialize error handler with toast system
        initErrorHandler(uiStore.addToast);

        let sampleInjected = uiStore.initialSampleInjected;

        const prefs = await getPreferences();
        preferencesStore.setPreferences(prefs);
        preferencesStore.setThemeSelection(prefs.theme_id ?? 'default');
        initLogger.debug('preferences loaded', prefs);

        // Check if this is first time running (no previous session with files)
        const isFirstTime = !session || !session.openFiles || session.openFiles.length === 0;

        if (isFirstTime) {
          // Load instructions document on first run instead of sample
          editorStore.setCurrentFile('instructions.md');
          editorStore.addOpenFile('instructions.md');
          editorStore.setContent(INSTRUCTIONS_DOC);
          uiStore.setInitialSampleInjected(true);
          sampleInjected = true;
          initLogger.debug('loaded instructions on first run');
        } else if (session && !sampleInjected) {
          try {
            const restored = Array.from(new Set(session.openFiles || [])).filter(f => {
              // Filter out invalid paths
              if (!f || f === 'instructions.md' || f === 'sample.md') return false;
              // Basic path validation - must have a proper extension and be a path
              if (!f.match(/\.(md|qmd)$/i) || !f.includes('/') && !f.includes('\\')) return false;
              return true;
            });

            for (const f of restored) {
              try {
                const content = await readMarkdownFile(f);
                editorStore.addOpenFile(f);
                if (f === session.currentFile) {
                  editorStore.setCurrentFile(f);
                  editorStore.setContent(content);
                }
              } catch (e) {
                initLogger.error(`Failed to restore file: ${f}`, e);
                // Continue with other files instead of stopping
              }
            }

            if (
              session.currentFile === 'instructions.md' ||
              session.currentFile === 'sample.md' ||
              (restored.length === 0 && !editorStore.editor.currentFile)
            ) {
              editorStore.setCurrentFile('instructions.md');
              editorStore.addOpenFile('instructions.md');
              editorStore.setContent(INSTRUCTIONS_DOC);
            }

            if (typeof session.previewVisible === 'boolean') {
              uiStore.setPreviewVisible(session.previewVisible);
            }

            uiStore.setInitialSampleInjected(true);
            sampleInjected = true;
          } catch (e) {
            initLogger.warn('Failed to restore session, falling back to instructions', e);
          }
        }

        if (!editorStore.editor.currentFile && !sampleInjected) {
          editorStore.setCurrentFile('instructions.md');
          editorStore.addOpenFile('instructions.md');
          editorStore.setContent(INSTRUCTIONS_DOC);
          uiStore.setInitialSampleInjected(true);
          sampleInjected = true;
        }

        // Register file change listener
        try {
          const unlistenFiles = await listenForFileChanges((filePath) => {
            const { editor: currentEditor } = useEditorStore.getState();
            if (filePath === currentEditor.currentFile) {
              // Placeholder for future reload logic.
            }
          });
          register(unlistenFiles);
        } catch (e) {
          initLogger.warn('Failed to register file-change listener', e);
        }

        // Register compiled event listener
        const unlistenCompiled = await listen<BackendRenderedDocument>('compiled', (evt) => {
          const { pdf_path, source_map } = evt.payload;
          const editorState = useEditorStore.getState();
          editorState.setCompileStatus({ status: 'ok', pdf_path, source_map });
          editorState.setSourceMap(source_map);
          editorState.setCompiledAt(Date.now());
          if (!editorState.activeAnchorId && source_map.anchors.length > 0) {
            editorState.setActiveAnchorId(source_map.anchors[0].id);
          }
          // Trigger a final sync pass in the preview once the backend has
          // delivered the compiled PDF and source map. This helps ensure
          // the preview performs a one-shot final render+refresh on app
          // startup rather than waiting for a subsequent document switch.
          try {
            // Delay a touch so the preview has a chance to mount and
            // wire listeners before the final sync event is consumed.
            setTimeout(() => {
              try { window.dispatchEvent(new CustomEvent('pdf-preview-final-sync')); } catch { /* ignore */ }
            }, TIMING.FINAL_SYNC_DELAY_MS);
          } catch {
            // ignore
          }
        });
        register(unlistenCompiled);

        // Register compile error listener
        const unlistenCompileError = await listen<string>('compile-error', (evt) => {
          initLogger.error('Compile error', evt.payload);
          const editorState = useEditorStore.getState();
          const uiState = useUIStore.getState();
          editorState.setCompileStatus({ status: 'error', message: 'Compile failed', details: evt.payload });
          editorState.setSourceMap(null);
          uiState.addToast({ type: 'error', message: 'Failed to compile document' });
        });
        register(unlistenCompileError);

        // Register preferences dump listener (debug)
        const unlistenPrefsDump = await listen<string>('prefs-dump', (evt) => {
          try {
            const json = JSON.parse(evt.payload) as Preferences;
            initLogger.debug('preferences', { toc: json.toc, numberSections: json.number_sections, papersize: json.papersize, margin: json.margin });
          } catch {
            initLogger.debug('raw preferences', evt.payload);
          }
        });
        register(unlistenPrefsDump);

        // Register render debug listener
        const unlistenRenderDebug = await listen<string>('render-debug', (evt) => {
          if (process.env.NODE_ENV !== 'production') {
            initLogger.debug('RenderDebug', evt.payload);
          }
        });
        register(unlistenRenderDebug);

        // Register Typst stderr listener
        const unlistenTypstStdErr = await listen<string>('typst-query-stderr', (evt) => {
          initLogger.warn('TypstQuery STDERR: ' + evt.payload);
        });
        register(unlistenTypstStdErr);

        // Register Typst stdout listener
        const unlistenTypstStdOut = await listen<string>('typst-query-stdout', (evt) => {
          initLogger.debug('TypstQuery STDOUT: ' + evt.payload);
        });
        register(unlistenTypstStdOut);

        // Register Typst query failed listener
        const unlistenTypstFailed = await listen<string>('typst-query-failed', () => {
          initLogger.warn('TypstQuery: no positions found, falling back to PDF-text extraction');
        });
        register(unlistenTypstFailed);

        initLogger.info('init complete');
      } catch (error) {
        initLogger.error('Init failed', error);
        const uiStore = useUIStore.getState();
        uiStore.addToast({
          type: 'error',
          message: 'Failed to initialize app. Please refresh the page.'
        });
      }
    };

    init();

    return () => {
      disposed = true;
      unsubscribes.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {
          initLogger.warn('Cleanup error', e);
        }
      });
    };
  }, []); // Run once on mount
}
