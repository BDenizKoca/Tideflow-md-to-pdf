/**
 * Hook to handle app initialization logic
 * Extracted from App.tsx to improve code organization
 */

import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

        // Check if a file was passed via Windows file-association (double-click or "Open with")
        const launchFilePath = await invoke<string | null>('get_launch_file_path').catch(() => null);
        if (launchFilePath) {
          initLogger.info('opening launch file', launchFilePath);
          try {
            const content = await readMarkdownFile(launchFilePath);
            editorStore.openDocument(launchFilePath, content);
            editorStore.setActiveDocument(launchFilePath);
            uiStore.setInitialSampleInjected(true);
            sampleInjected = true;
          } catch (e) {
            initLogger.error('Failed to open launch file', e);
          }
        }

        // Check if this is first time running (no previous session with files)
        const isFirstTime = !session || !session.openFiles || session.openFiles.length === 0;

        if (isFirstTime) {
          // Load instructions document on first run instead of sample
          editorStore.openDocument('instructions.md', INSTRUCTIONS_DOC);
          editorStore.setActiveDocument('instructions.md');
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
                editorStore.openDocument(f, content);
              } catch (e) {
                initLogger.error(`Failed to restore file: ${f}`, e);
                // Continue with other files instead of stopping
              }
            }

            // Pick which file to focus. Prefer the saved active file if it
            // was successfully restored; otherwise the last one in tab
            // order; otherwise fall through to instructions.
            const restoredSet = new Set(useEditorStore.getState().openFiles);
            if (session.currentFile && restoredSet.has(session.currentFile)) {
              editorStore.setActiveDocument(session.currentFile);
            } else if (
              session.currentFile === 'instructions.md' ||
              session.currentFile === 'sample.md' ||
              restoredSet.size === 0
            ) {
              editorStore.openDocument('instructions.md', INSTRUCTIONS_DOC);
              editorStore.setActiveDocument('instructions.md');
            } else {
              const last = useEditorStore.getState().openFiles.at(-1);
              if (last) editorStore.setActiveDocument(last);
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

        if (!useEditorStore.getState().activeFile && !sampleInjected) {
          editorStore.openDocument('instructions.md', INSTRUCTIONS_DOC);
          editorStore.setActiveDocument('instructions.md');
          uiStore.setInitialSampleInjected(true);
          sampleInjected = true;
        }

        // Register file change listener
        try {
          const unlistenFiles = await listenForFileChanges((filePath) => {
            const { activeFile } = useEditorStore.getState();
            if (filePath === activeFile) {
              // Placeholder for future reload logic.
            }
          });
          register(unlistenFiles);
        } catch (e) {
          initLogger.warn('Failed to register file-change listener', e);
        }

        // Register compiled event listener.
        // The backend's `compiled` event doesn't carry a file path — it's a
        // side-channel notification that the most recent render finished.
        // We attribute it to whichever file is active when it fires; if the
        // user has switched tabs in the meantime the result was for the
        // previous file, but since that file's content is what got rendered
        // there's no real harm — it just means the wrong document briefly
        // sees an extra setSourceMap. The primary render path goes through
        // renderTypst() which threads the path explicitly.
        const unlistenCompiled = await listen<BackendRenderedDocument>('compiled', (evt) => {
          const { pdf_path, source_map } = evt.payload;
          const s = useEditorStore.getState();
          const path = s.activeFile;
          if (!path) return;
          s.setCompileStatus(path, { status: 'ok', pdf_path, source_map });
          s.setSourceMap(path, source_map);
          s.setCompiledAt(Date.now());
          const activeDoc = s.documents[path];
          if (activeDoc && !activeDoc.activeAnchorId && source_map.anchors.length > 0) {
            s.setActiveAnchor(path, source_map.anchors[0].id);
          }
          // Trigger a final sync pass in the preview once the backend has
          // delivered the compiled PDF and source map.
          try {
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
          const errorMsg = evt.payload;

          // Check if it's a missing citation error
          const isCitationError = /key `([^`]+)` does not exist in the bibliography/i.test(errorMsg);

          if (isCitationError) {
            // For citation errors, only log - don't show blocking error
            // The useContentManagement hook will show a gentle warning toast
            initLogger.warn('Missing citation key in document');
          } else {
            // For other errors, show full error state on the active file
            initLogger.error('Compile error', errorMsg);
            const s = useEditorStore.getState();
            const uiState = useUIStore.getState();
            const path = s.activeFile;
            if (path) {
              s.setCompileStatus(path, { status: 'error', message: 'Compile failed', details: errorMsg });
              s.setSourceMap(path, null);
            }
            uiState.addToast({ type: 'error', message: 'Failed to compile document' });
          }
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

        // Handle files forwarded from a second instance (single-instance plugin)
        // Fires when the user double-clicks a .md file while Tideflow is already open.
        const unlistenOpenFile = await listen<string>('open-file', async (evt) => {
          const path = evt.payload;
          if (!path) return;
          initLogger.info('open-file event received', path);
          try {
            const content = await readMarkdownFile(path);
            const store = useEditorStore.getState();
            store.openDocument(path, content);
            store.setActiveDocument(path);
          } catch (e) {
            initLogger.error('Failed to open forwarded file', e);
            useUIStore.getState().addToast({ type: 'error', message: `Could not open file: ${path}` });
          }
        });
        register(unlistenOpenFile);

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
