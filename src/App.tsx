import { useEffect, useState } from 'react';
import { 
  Panel, 
  PanelGroup, 
  PanelResizeHandle 
} from 'react-resizable-panels';
import { useEditorStore } from './stores/editorStore';
import { useUIStore } from './stores/uiStore';
import { loadSession, saveSession } from './utils/session';
import { logger } from './utils/logger';
import './App.css';
import { INSTRUCTIONS_DOC } from './instructionsDoc';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useWindowManagement } from './hooks/useWindowManagement';
import { UI_CONSTANTS, SESSION_CONSTANTS } from './constants/editor';

// Import components
import TabBar from './components/TabBar';
import Editor from './components/Editor';
import PDFPreview from './components/PDFPreview';
import PDFErrorBoundary from './components/PDFErrorBoundary';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import { ToastContainer } from './components/ToastContainer';

// Create scoped logger for App component
const appLogger = logger.createScoped('App');

function App() {
  const [loading, setLoading] = useState(true);
  const previewVisible = useUIStore((state) => state.previewVisible);
  const editor = useEditorStore((state) => state.editor);
  const isTyping = useEditorStore((state) => state.isTyping);

  // Simple collapse flag; no persistence
  const previewCollapsed = !previewVisible;

  // Removed all panel persistence logic for fixed layout.

  // Initialize app with extracted hook
  useAppInitialization();

  // Window management and fullscreen logic
  useWindowManagement(setLoading);

  // Autosave session when key state changes (debounced to prevent corruption)
  const openFiles = useEditorStore((state) => state.editor.openFiles);
  const currentFile = useEditorStore((state) => state.editor.currentFile);
  const previewVisibleState = useUIStore((state) => state.previewVisible);
  
  // Load instructions.md content when it's set as current file
  useEffect(() => {
    const loadInstructionsContent = async () => {
      const editorState = useEditorStore.getState();
      if (currentFile === 'instructions.md' && editorState.editor.content === '# Loading instructions...') {
        editorState.setContent(INSTRUCTIONS_DOC);
      }
    };
    loadInstructionsContent();
  }, [currentFile]);
  
  useEffect(() => {
    // Debounce session saves to prevent high-frequency localStorage writes
    const timeoutId = setTimeout(() => {
      try {
        // Read current session once at the start for atomic update
        const currentSession = loadSession();
        saveSession({
          openFiles,
          currentFile,
          previewVisible: previewVisibleState,
          // Preserve fullscreen from current session (it's saved separately on fullscreen event)
          fullscreen: currentSession?.fullscreen ?? false,
        });
      } catch (error) {
        appLogger.warn('Failed to save session', error);
      }
    }, SESSION_CONSTANTS.SAVE_DEBOUNCE_MS); // Debounced session save
    
    return () => clearTimeout(timeoutId);
  }, [openFiles, currentFile, previewVisibleState]);

  // Simplified toggle: no remount side effects needed.
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Tideflow...</div>
      </div>
    );
  }
  // Compute default sizes: if collapsed -> editor 100%, else restored or fallback (55/45)
  const defaultEditorSize = previewCollapsed ? 100 : UI_CONSTANTS.DEFAULT_EDITOR_SIZE;
  const defaultPreviewSize = previewCollapsed ? UI_CONSTANTS.COLLAPSED_PANEL_SIZE : UI_CONSTANTS.DEFAULT_PREVIEW_SIZE;
  const panelGroupKey = `pg-fixed-${previewCollapsed ? 'collapsed' : 'open'}`;

  return (
    <div className="app">
      <Toolbar />
      <TabBar />
      <div className="address-bar">
        <span className="current-file-path">{editor.currentFile || 'No file open'}</span>
        {isTyping && (
          <span className="typing-indicator">
            ⌨️ Typing
          </span>
        )}
      </div>
      <div className="main-content">
        <PanelGroup key={panelGroupKey} direction="horizontal" style={{ height: '100%', overflow: 'hidden' }}>
          <Panel
            defaultSize={defaultEditorSize}
            minSize={UI_CONSTANTS.MIN_PANEL_SIZE}
            maxSize={previewCollapsed ? 100 : UI_CONSTANTS.MAX_PANEL_SIZE}
            style={{ overflow: 'hidden', minWidth: 0 }}
          >
            <Editor />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel
            // When collapsed, force a tiny size
            defaultSize={defaultPreviewSize}
            minSize={previewCollapsed ? UI_CONSTANTS.COLLAPSED_PANEL_SIZE : UI_CONSTANTS.MIN_PANEL_SIZE}
            maxSize={previewCollapsed ? UI_CONSTANTS.COLLAPSED_PANEL_SIZE : UI_CONSTANTS.MAX_PANEL_SIZE}
            style={{ 
              overflow: 'hidden', 
              minWidth: 0, 
              display: previewCollapsed ? 'none' : 'block' 
            }}
          >
            {/* Only mount PDFPreview when not collapsed to avoid wasted renders */}
            {!previewCollapsed && (
              <PDFErrorBoundary>
                <PDFPreview key={editor.currentFile || 'no-file'} />
              </PDFErrorBoundary>
            )}
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  );
}

export default App;
