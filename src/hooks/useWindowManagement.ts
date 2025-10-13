import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { confirm } from '@tauri-apps/plugin-dialog';
import { useEditorStore } from '../stores/editorStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useUIStore } from '../stores/uiStore';
import { loadSession, saveSession } from '../utils/session';
import { logger } from '../utils/logger';

const windowMgmtLogger = logger.createScoped('useWindowManagement');

/**
 * Hook to manage window-level behaviors:
 * - Close request handling with unsaved changes confirmation
 * - Window maximize/restore on launch
 * - Fullscreen toggle via custom events
 * - Session persistence for window state
 */
export function useWindowManagement(setLoading: (loading: boolean) => void) {
  useEffect(() => {
    let disposed = false;
    let unsubscribes: Array<() => void> = [];

    const register = (unlisten: (() => void) | Promise<() => void>) => {
      if (unlisten instanceof Promise) {
        unlisten.then(fn => {
          if (!disposed) {
            unsubscribes.push(fn);
          }
        }).catch(() => {
          // ignore cleanup failures for registrations that resolve after teardown
        });
      } else {
        unsubscribes.push(unlisten);
      }
    };

    const setupWindowManagement = async () => {
      try {
        // Listen for window close requests
        const appWindow = getCurrentWindow();
        const unlistenCloseRequested = await appWindow.onCloseRequested(async (event) => {
          windowMgmtLogger.info('Close requested');

          // Always prevent default and handle close manually
          event.preventDefault();

          const editor = useEditorStore.getState().editor;
          const preferences = usePreferencesStore.getState().preferences;
          const previewVisible = useUIStore.getState().previewVisible;

          windowMgmtLogger.debug('Close handler', { modified: editor.modified, confirm_exit_on_unsaved: preferences.confirm_exit_on_unsaved });

          // Save window state before potential exit
          const isMaximized = await appWindow.isMaximized();
          saveSession({ maximized: isMaximized });

          // Check if there are unsaved changes and confirmation is enabled
          if (editor.modified && preferences.confirm_exit_on_unsaved) {
            // Ask for confirmation using Tauri dialog
            const result = await confirm(
              'You have unsaved changes. Do you want to exit without saving?',
              {
                title: 'Unsaved Changes',
                kind: 'warning',
                okLabel: 'Exit',
                cancelLabel: 'Cancel'
              }
            );

            if (result) {
              windowMgmtLogger.info('User confirmed exit');
              // User confirmed exit, save session and close
              windowMgmtLogger.debug('Saving session and destroying window');
              saveSession({
                currentFile: editor.currentFile,
                openFiles: editor.openFiles,
                previewVisible,
              });
              // Destroy the window
              await appWindow.destroy();
              windowMgmtLogger.debug('Window destroy called');
            }
            // If not confirmed, do nothing (window stays open)
          } else {
            windowMgmtLogger.debug('No unsaved changes or confirmation disabled - closing immediately');
            // No unsaved changes or confirmation disabled, save session and close
            saveSession({
              currentFile: editor.currentFile,
              openFiles: editor.openFiles,
              previewVisible,
            });
            // Close the window
            windowMgmtLogger.debug('Calling destroy on window');
            await appWindow.destroy();
            windowMgmtLogger.debug('Window destroy called');
          }
        });
        register(unlistenCloseRequested);

        // Restore or set default window state
        const windowSession = loadSession();
        const shouldMaximize = windowSession?.maximized ?? true; // Default to maximized
        if (shouldMaximize) {
          await appWindow.maximize();
        }

        // Listen for fullscreen requests dispatched from UI components.
        const onReqFs = (ev: Event) => {
          try {
            const ce = ev as CustomEvent<{ fullscreen?: boolean }>;
            const want = ce?.detail?.fullscreen;
            if (typeof want !== 'boolean') return;
            // Persist preference
            try { saveSession({ fullscreen: want }); } catch { /* ignore */ }
            // Try Tauri window API if available
            (async () => {
              try {
                const mod = await import('@tauri-apps/api/window');
                const modTyped = mod as { getCurrentWindow?: () => unknown; getCurrent?: () => unknown; appWindow?: unknown };
                const win = modTyped.getCurrentWindow?.() || modTyped.getCurrent?.() || modTyped.appWindow;
                if (win && typeof (win as { setFullscreen?: unknown }).setFullscreen === 'function') {
                  try { await (win as { setFullscreen: (f: boolean) => Promise<void> }).setFullscreen(want); } catch (e) { windowMgmtLogger.debug('setFullscreen failed', e); }
                  return;
                }
              } catch (e) {
                void e; // dynamic import failed; fall through to DOM API
              }
              // Fallback: use DOM Fullscreen API on the document element
              try {
                if (want) {
                  if (document.documentElement.requestFullscreen) {
                    // requestFullscreen returns a Promise
                    void document.documentElement.requestFullscreen();
                  }
                } else {
                  if (document.fullscreenElement) {
                    void document.exitFullscreen();
                  }
                }
              } catch (e) {
                windowMgmtLogger.debug('DOM fullscreen toggle failed', e);
              }
            })();
          } catch (e) {
            void e;
          }
        };
        window.addEventListener('tideflow-request-fullscreen', onReqFs as EventListener);
        // unregister on cleanup
        register(() => window.removeEventListener('tideflow-request-fullscreen', onReqFs as EventListener));

        // Set loading to false and apply saved fullscreen
        if (!disposed) {
          setLoading(false);
          windowMgmtLogger.info('window management setup complete');
          // Apply saved fullscreen if requested in session
          try {
            const s = loadSession();
            if (s?.fullscreen) {
              windowMgmtLogger.debug('applying saved fullscreen');
              try {
                window.dispatchEvent(new CustomEvent('tideflow-request-fullscreen', { detail: { fullscreen: true } }));
              } catch (err) {
                windowMgmtLogger.warn('failed to dispatch tideflow-request-fullscreen', err);
              }
            }
          } catch (err) {
            windowMgmtLogger.warn('failed to read session for fullscreen', err);
          }
        }
      } catch (error) {
        windowMgmtLogger.error('Window management setup failed', error);
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    setupWindowManagement();

    return () => {
      disposed = true;
      for (const unlisten of unsubscribes) {
        try {
          unlisten();
        } catch {
          // ignore cleanup failures
        }
      }
      unsubscribes = [];
    };
  }, [setLoading]);
}
