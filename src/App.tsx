import { useEffect, useState, useRef } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useEditorStore } from './stores/editorStore';
import { useUIStore } from './stores/uiStore';
import { saveSession } from './utils/session';
import { logger } from './utils/logger';
import './App.css';
import { INSTRUCTIONS_DOC } from './instructionsDoc';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useWindowManagement } from './hooks/useWindowManagement';

// Import components
import TabBar from './components/TabBar';
import Editor from './components/Editor';
import MarkdownPreview from './components/MarkdownPreview';
import PDFPreview from './components/PDFPreview';
import PDFErrorBoundary from './components/PDFErrorBoundary';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import { ToastContainer } from './components/ToastContainer';

// Create scoped logger for App component
const appLogger = logger.createScoped('App');

function App() {
  const [loading, setLoading] = useState(true);
  const {
    previewVisible,
    setPreviewVisible,
    markdownPreviewVisible,
    setMarkdownPreviewVisible,
  } = useUIStore();
  const isTyping = useEditorStore((state) => state.isTyping);
  const previewPanelRef = useRef<ImperativePanelHandle>(null);
  const markdownPanelRef = useRef<ImperativePanelHandle>(null);
  const isDraggingRef = useRef(false);
  const isMarkdownDraggingRef = useRef(false);

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
      // Share the right half with whichever other previews are visible.
      panel.resize(markdownPreviewVisible ? 34 : 50);
    } else {
      if (!panel.isCollapsed()) {
        panel.collapse();
      }
    }
  }, [previewVisible, markdownPreviewVisible]);

  // Effect to control live Markdown preview (middle) panel visibility and size
  useEffect(() => {
    const panel = markdownPanelRef.current;
    if (!panel) return;

    if (markdownPreviewVisible) {
      if (panel.isCollapsed()) {
        panel.expand();
      }
      panel.resize(previewVisible ? 33 : 50);
    } else {
      if (!panel.isCollapsed()) {
        panel.collapse();
      }
    }
  }, [markdownPreviewVisible, previewVisible]);

  // Autosave session when key state changes
  const openFiles = useEditorStore((state) => state.openFiles);
  const currentFile = useEditorStore((state) => state.activeFile);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        // saveSession merges with the existing stored session, so fields we
        // don't pass (e.g. fullscreen, maximized) are preserved automatically.
        saveSession({ openFiles, currentFile, previewVisible, markdownPreviewVisible });
      } catch (error) {
        appLogger.warn('Failed to save session', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [openFiles, currentFile, previewVisible, markdownPreviewVisible]);

  // Late-load instructions.md if the placeholder is still showing.
  // (Belt-and-braces: useAppInitialization seeds the real content on first
  // run, but if some path managed to leave the placeholder in place we
  // replace it here.)
  useEffect(() => {
    const s = useEditorStore.getState();
    const doc = currentFile ? s.documents[currentFile] : null;
    if (currentFile === 'instructions.md' && doc?.content === '# Loading instructions...') {
      s.updateDocumentContent(currentFile, INSTRUCTIONS_DOC);
    }
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
        <span className="current-file-path">{currentFile || 'No file open'}</span>
        {isTyping && <span className="typing-indicator">⌨️ Typing</span>}
      </div>
      <div className="main-content">
        <PanelGroup direction="horizontal" style={{ height: '100%', overflow: 'hidden' }}>
          <Panel defaultSize={34} minSize={20}>
            <Editor />
          </Panel>
          <PanelResizeHandle
            className="resize-handle"
            onDragging={(isDragging) => (isMarkdownDraggingRef.current = isDragging)}
          />
          <Panel
            ref={markdownPanelRef}
            collapsible
            defaultSize={33}
            minSize={15}
            onCollapse={() => {
              // Sync state if user manually collapses panel by dragging
              if (isMarkdownDraggingRef.current && markdownPreviewVisible) {
                setMarkdownPreviewVisible(false);
              }
            }}
          >
            <MarkdownPreview />
          </Panel>
          <PanelResizeHandle
            className="resize-handle"
            onDragging={(isDragging) => (isDraggingRef.current = isDragging)}
          />
          <Panel
            ref={previewPanelRef}
            collapsible
            defaultSize={33}
            minSize={20}
            onCollapse={() => {
              // Sync state if user manually collapses panel by dragging
              if (isDraggingRef.current && previewVisible) {
                setPreviewVisible(false);
              }
            }}
          >
            <PDFErrorBoundary>
              <PDFPreview />
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