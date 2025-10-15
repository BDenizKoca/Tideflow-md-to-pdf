import { useEffect, useState, useRef } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useEditorStore } from './stores/editorStore';
import { useUIStore } from './stores/uiStore';
import { loadSession, saveSession } from './utils/session';
import { logger } from './utils/logger';
import './App.css';
import { INSTRUCTIONS_DOC } from './instructionsDoc';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useWindowManagement } from './hooks/useWindowManagement';

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
  const { previewVisible, setPreviewVisible } = useUIStore();
  const editor = useEditorStore((state) => state.editor);
  const isTyping = useEditorStore((state) => state.isTyping);
  const previewPanelRef = useRef<ImperativePanelHandle>(null);
  const isDraggingRef = useRef(false);

  // Initialize app with extracted hook
  useAppInitialization();

  // Window management and fullscreen logic
  useWindowManagement(setLoading);

  // Effect to control PDF preview panel visibility and size
  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel) return;

    if (previewVisible) {
      if (panel.isCollapsed()) {
        panel.expand();
      }
      panel.resize(50); // Always reset to 50% when shown
    } else {
      if (!panel.isCollapsed()) {
        panel.collapse();
      }
    }
  }, [previewVisible]);

  // Autosave session when key state changes
  const openFiles = useEditorStore((state) => state.editor.openFiles);
  const currentFile = useEditorStore((state) => state.editor.currentFile);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const currentSession = loadSession();
        saveSession({
          openFiles,
          currentFile,
          previewVisible,
          fullscreen: currentSession?.fullscreen ?? false,
        });
      } catch (error) {
        appLogger.warn('Failed to save session', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [openFiles, currentFile, previewVisible]);

  // Load instructions.md content
  useEffect(() => {
    const loadInstructions = async () => {
      const editorState = useEditorStore.getState();
      if (currentFile === 'instructions.md' && editorState.editor.content === '# Loading instructions...') {
        editorState.setContent(INSTRUCTIONS_DOC);
      }
    };
    loadInstructions();
  }, [currentFile]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Tideflow...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar />
      <TabBar />
      <div className="address-bar">
        <span className="current-file-path">{editor.currentFile || 'No file open'}</span>
        {isTyping && <span className="typing-indicator">⌨️ Typing</span>}
      </div>
      <div className="main-content">
        <PanelGroup direction="horizontal" style={{ height: '100%', overflow: 'hidden' }}>
          <Panel defaultSize={50} minSize={25}>
            <Editor key={editor.currentFile || 'no-file'} />
          </Panel>
          <PanelResizeHandle
            className="resize-handle"
            onDragging={(isDragging) => (isDraggingRef.current = isDragging)}
          />
          <Panel
            ref={previewPanelRef}
            collapsible
            defaultSize={50}
            minSize={20}
            onCollapse={() => {
              // Sync state if user manually collapses panel by dragging
              if (isDraggingRef.current && previewVisible) {
                setPreviewVisible(false);
              }
            }}
          >
            <PDFErrorBoundary>
              <PDFPreview key={editor.currentFile || 'no-file'} />
            </PDFErrorBoundary>
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  );
}

export default App;