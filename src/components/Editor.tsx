import React, { useState, useRef } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import './Editor.css';
import ImagePropsModal, { type ImageProps } from './ImagePropsModal';
import ImagePlusModal from './ImagePlusModal';
import EditorToolbar from './EditorToolbar';
import ErrorBoundary from './ErrorBoundary';
import { useImageHandlers } from '../hooks/useImageHandlers';
import { openSearchPanel, closeSearchPanel } from '@codemirror/search';
import { importImage, importImageFromPath, generateImageMarkdown } from '../api';
import { showSuccess } from '../utils/errorHandler';
import { cmd } from './commands';
import { useEditorState } from '../hooks/useEditorState';
import { useEditorSync } from '../hooks/useEditorSync';
import { useContentManagement } from '../hooks/useContentManagement';
import { useFileOperations } from '../hooks/useFileOperations';
import { useCodeMirrorSetup } from '../hooks/useCodeMirrorSetup';
import { useAnchorManagement } from '../hooks/useAnchorManagement';
import { useEditorLifecycle } from '../hooks/useEditorLifecycle';
import { showOpenDialog, readMarkdownFile } from '../api';
import { INSTRUCTIONS_DOC } from '../instructionsDoc';
import { handleError } from '../utils/errorHandler';
import { listen } from '@tauri-apps/api/event';

const Editor: React.FC = () => {
  // Store state
  const addToast = useUIStore((state) => state.addToast);
  const setPreviewVisible = useUIStore((s) => s.setPreviewVisible);
  const addRecentFile = useUIStore((s) => s.addRecentFile);
  const {
    editor: { currentFile, content, modified, openFiles },
    setContent,
    setModified,
    setCompileStatus,
    sourceMap,
    setSourceMap,
    activeAnchorId,
    setActiveAnchorId,
    syncMode,
    setSyncMode,
    isTyping,
    setIsTyping,
    setEditorScrollPosition,
    getEditorScrollPosition,
    setCurrentFile,
    addOpenFile,
  } = useEditorStore();
  const preferences = usePreferencesStore((state) => state.preferences);

  // Local state
  const [, setIsSaving] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>("Latin Modern Roman");
  const [editorReady, setEditorReady] = useState(false);
  const listenerSetupRef = useRef(false);
  const lastProcessedFileRef = useRef<string | null>(null);

  // Use editor state hook - consolidates all refs
  const editorStateRefs = useEditorState({
    activeAnchorId,
    syncMode,
    isTyping,
    openFiles,
  });

  // Use editor sync hook - scroll synchronization
  const { computeAnchorFromViewport, setupScrollListener } = useEditorSync({
    editorStateRefs,
    currentFile,
    sourceMap,
    setSyncMode,
    setActiveAnchorId,
    setEditorScrollPosition,
  });

  // Use content management hook - auto-render
  const { handleAutoRender } = useContentManagement({
    editorStateRefs,
    currentFile,
    sourceMap,
    setCompileStatus,
    setSourceMap,
    setSyncMode,
  });

  // Use file operations hook - save/render/file switching
  const { handleSave: handleSaveBase, handleRender } = useFileOperations({
    editorStateRefs,
    currentFile,
    content,
    modified,
    sourceMap,
    editorReady,
    setModified,
    setCompileStatus,
    setSourceMap,
    setEditorScrollPosition,
    getEditorScrollPosition,
    handleAutoRender,
    computeAnchorFromViewport,
  });

  // Wrap handleSave to pass setIsSaving and addToast
  const handleSave = () => handleSaveBase(setIsSaving, addToast);

  // Wrap handleRender to pass setPreviewVisible
  const handleRenderWithPreview = () => handleRender(setPreviewVisible);

  // Use CodeMirror setup hook - editor initialization
  useCodeMirrorSetup({
    editorStateRefs,
    content,
    setContent,
    setModified,
    setIsTyping,
    handleSave,
    handleRender: handleRenderWithPreview,
    handleAutoRender,
    renderDebounceMs: preferences.render_debounce_ms,
    setupScrollListener,
    setEditorReady,
  });

  // Use anchor management hook - anchor sync effects
  useAnchorManagement({
    editorStateRefs,
    sourceMap,
    activeAnchorId,
    setActiveAnchorId,
  });

  // Use editor lifecycle hook - generation tracking
  useEditorLifecycle({
    editorStateRefs,
    openFiles,
  });

  // Image handlers (must come before unified drop handler)
  const {
    imageModalOpen,
    setImageModalOpen,
    imageModalResolveRef,
    imageInitial,
    imagePlusOpen,
    setImagePlusOpen,
    imagePlusPath,
    setImagePlusPath,
    handleImageInsert,
    handlePaste,
    // handleDrop, // Not currently used
    promptImageProps,
  } = useImageHandlers({
    preferences,
    importImage,
    importImageFromPath,
    generateImageMarkdown,
    showSuccess,
    insertSnippet: (snippet: string) => {
      if (editorStateRefs.editorViewRef.current) {
        const state = editorStateRefs.editorViewRef.current.state;
        const transaction = state.update({
          changes: { from: state.selection.main.head, insert: snippet }
        });
        editorStateRefs.editorViewRef.current.dispatch(transaction);
      }
    },
  });

  // Container ref for attaching drop handler
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Listen for Tauri file drop events
  React.useEffect(() => {
    if (listenerSetupRef.current) return;
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {

      unlisten = await listen<{ paths: string[]; position: { x: number; y: number } } | string[]>('tauri://drag-drop', async (event) => {
        // Handle both payload formats: object with paths property, or array directly
        const payload = event.payload;
        const paths = (payload && typeof payload === 'object' && 'paths' in payload)
          ? payload.paths
          : Array.isArray(payload) ? payload : [];
        
        // Get drop position if available
        const position = (payload && typeof payload === 'object' && 'position' in payload) 
          ? payload.position 
          : null;

        if (paths && paths.length > 0) {
          const filePath = paths[0];

          // Prevent duplicate processing of the same file
          if (lastProcessedFileRef.current === filePath) {
            return;
          }
          lastProcessedFileRef.current = filePath;

          // Check if file was dropped on the editor text area
          const droppedOnEditor = position && editorStateRefs.editorViewRef.current?.dom && (() => {
            const editorRect = editorStateRefs.editorViewRef.current.dom.getBoundingClientRect();
            const isInBounds = position.x >= editorRect.left && 
                   position.x <= editorRect.right && 
                   position.y >= editorRect.top && 
                   position.y <= editorRect.bottom;
            console.log('[Editor] Drop position check:', { position, editorRect, isInBounds });
            return isInBounds;
          })();

          console.log('[Editor] Dropped on editor:', droppedOnEditor);

          // Check if it's a markdown file
          if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
            try {
              // If dropped on editor area, insert content at cursor
              if (droppedOnEditor && editorStateRefs.editorViewRef.current) {
                const content = await readMarkdownFile(filePath);
                const state = editorStateRefs.editorViewRef.current.state;
                const transaction = state.update({
                  changes: { from: state.selection.main.head, insert: content }
                });
                editorStateRefs.editorViewRef.current.dispatch(transaction);
                addToast({ message: `Inserted content from: ${filePath.split(/[\\/]/).pop()}`, type: 'success' });
              } 
              // Otherwise, open as new tab
              else {
                const content = await readMarkdownFile(filePath);
                addOpenFile(filePath);
                setCurrentFile(filePath);
                setContent(content);
                addRecentFile(filePath);
                addToast({ message: `Opened file: ${filePath.split(/[\\/]/).pop()}`, type: 'success' });
              }
            } catch (err) {
              handleError(err, { operation: 'handle dropped markdown file', component: 'Editor' });
            }
          }
          // Check if it's an image - always insert at cursor
          else if (filePath.match(/\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i)) {
            try {
              const assetPath = await importImageFromPath(filePath);
              const fileName = filePath.split(/[\\/]/).pop() || 'image';

              // Prompt for image properties before inserting
              const initial: ImageProps = {
                width: preferences.default_image_width,
                alignment: preferences.default_image_alignment as ImageProps['alignment'],
                alt: fileName.replace(/\.[^.]+$/, '')
              };

              const chosen = await promptImageProps(initial);
              if (chosen) {
                const imageMarkdown = generateImageMarkdown(
                  assetPath,
                  chosen.width,
                  chosen.alignment,
                  chosen.alt
                );

                if (editorStateRefs.editorViewRef.current) {
                  const state = editorStateRefs.editorViewRef.current.state;
                  const transaction = state.update({
                    changes: { from: state.selection.main.head, insert: imageMarkdown }
                  });
                  editorStateRefs.editorViewRef.current.dispatch(transaction);
                }

                addToast({ message: `Image inserted: ${fileName}`, type: 'success' });
              }
            } catch (err) {
              handleError(err, { operation: 'import dropped image', component: 'Editor' });
            }
          }
        }
      });
    };

    setupListener();
    listenerSetupRef.current = true;

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [
    addOpenFile, 
    setCurrentFile, 
    setContent, 
    addRecentFile, 
    addToast, 
    promptImageProps, 
    editorStateRefs.editorViewRef, 
    preferences.default_image_width, 
    preferences.default_image_alignment
  ]);

  // Handle search toggle
  const handleSearchToggle = React.useCallback(() => {
    if (!editorStateRefs.editorViewRef.current) return;

    const view = editorStateRefs.editorViewRef.current;

    // Toggle search panel: if close returns false, panel wasn't open, so open it
    const closed = closeSearchPanel(view);
    if (!closed) {
      openSearchPanel(view);
    }
  }, [editorStateRefs.editorViewRef]);

  // Global keyboard shortcuts handler
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on Mac
      const view = editorStateRefs.editorViewRef.current;

      // File Operations
      if (isMod && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        // Trigger new file - handled by Toolbar
        const newBtn = document.querySelector<HTMLButtonElement>('button[title*="New File"]');
        newBtn?.click();
        return;
      }

      if (isMod && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        e.stopPropagation();
        // Trigger open file - handled by Toolbar
        const openBtn = document.querySelector<HTMLButtonElement>('button[title*="Open File"]');
        openBtn?.click();
        return;
      }

      if (isMod && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        // Save handled by file operations hook
        handleSave();
        return;
      }

      // Text Formatting (only when editor is available)
      if (view) {
        if (isMod && !e.shiftKey && e.key === 'b') {
          e.preventDefault();
          e.stopPropagation();
          cmd.bold(view);
          return;
        }

        if (isMod && !e.shiftKey && e.key === 'i') {
          e.preventDefault();
          e.stopPropagation();
          cmd.italic(view);
          return;
        }

        if (isMod && !e.shiftKey && e.key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          cmd.underline(view);
          return;
        }

        if (isMod && !e.shiftKey && e.key === 'k') {
          e.preventDefault();
          e.stopPropagation();
          cmd.link(view);
          return;
        }

        if (isMod && e.shiftKey && e.key === 'K') {
          e.preventDefault();
          e.stopPropagation();
          cmd.codeBlock(view);
          return;
        }

        // Document Structure
        if (isMod && !e.shiftKey && e.key === 'h') {
          e.preventDefault();
          e.stopPropagation();
          cmd.heading(view, 1);
          return;
        }

        if (isMod && !e.shiftKey && e.key === 'l') {
          e.preventDefault();
          e.stopPropagation();
          cmd.ul(view);
          return;
        }

        if (isMod && e.shiftKey && e.key === 'Q') {
          e.preventDefault();
          e.stopPropagation();
          cmd.quote(view);
          return;
        }

        if (isMod && e.shiftKey && e.key === 'T') {
          e.preventDefault();
          e.stopPropagation();
          cmd.table(view);
          return;
        }
      }

      // View & Navigation
      if (isMod && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        e.stopPropagation();
        setPreviewVisible(!useUIStore.getState().previewVisible);
        return;
      }

      if (isMod && !e.shiftKey && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        handleSearchToggle();
        return;
      }

      if (isMod && !e.shiftKey && e.key === ',') {
        e.preventDefault();
        e.stopPropagation();
        const uiStore = useUIStore.getState();
        uiStore.setDesignModalOpen(true);
        return;
      }

      // Export & Actions
      if (isMod && !e.shiftKey && e.key === 'e') {
        e.preventDefault();
        e.stopPropagation();
        // Trigger export PDF - handled by Toolbar
        const exportBtn = document.querySelector<HTMLButtonElement>('button[title*="Export PDF"]');
        exportBtn?.click();
        return;
      }

      if (isMod && !e.shiftKey && e.key === 'r') {
        e.preventDefault();
        e.stopPropagation();
        handleRenderWithPreview();
        return;
      }
    };

    // Add listener to window
    window.addEventListener('keydown', handleGlobalKeyDown, true);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [handleSearchToggle, handleSave, handleRenderWithPreview, setPreviewVisible, editorStateRefs.editorViewRef]);

  // Handle font changes
  const handleFontChange = async (font: string) => {
    if (!editorStateRefs.editorViewRef.current) {
      return;
    }
    setSelectedFont(font);
    cmd.fontLocal(editorStateRefs.editorViewRef.current, font);
  };

  // Handle opening a file from the no-file screen
  const handleOpenFile = async () => {
    try {
      const result = await showOpenDialog([{
        name: 'Markdown',
        extensions: ['md', 'markdown']
      }]);

      if (result && result.length > 0) {
        const filePath = result[0];
        const fileContent = await readMarkdownFile(filePath);
        addOpenFile(filePath);
        setCurrentFile(filePath);
        setContent(fileContent);
        addRecentFile(filePath);
      }
    } catch (err) {
      handleError(err, { operation: 'open file', component: 'Editor' });
    }
  };

  // Handle opening instructions from the no-file screen
  const handleOpenInstructions = () => {
    const instructionsName = 'instructions.md';
    addOpenFile(instructionsName);
    setCurrentFile(instructionsName);
    setContent(INSTRUCTIONS_DOC);
  };

  return (
    <ErrorBoundary>
      <div
        ref={containerRef}
        className="editor-container"
        onPaste={handlePaste}
      >
        {/* Always render editor toolbar and content, but hide when no file */}
        <div className={`editor-content-wrapper ${currentFile ? '' : 'hidden'}`}>
          <EditorToolbar
          currentFile={currentFile || ''}
          preferences={preferences}
          selectedFont={selectedFont}
          editorView={editorStateRefs.editorViewRef.current}
          onRender={handleRenderWithPreview}
          onFontChange={handleFontChange}
          onImageInsert={handleImageInsert}
          onImagePlusOpen={() => setImagePlusOpen(true)}
          onImageWidthChange={(width: string) => {
            if (editorStateRefs.editorViewRef.current) {
              cmd.imageWidth(editorStateRefs.editorViewRef.current, width);
            }
          }}
          onSearchToggle={handleSearchToggle}
        />

        <div className="editor-content" ref={editorStateRefs.editorRef} />
      </div>

      {/* Show "no file" message when no file is open */}
      {!currentFile && (
        <div className="no-file-message">
          <h2>📄 No File Open</h2>
          <p>Get started by opening a markdown file or viewing the instructions.</p>
          <div className="no-file-actions">
            <button onClick={handleOpenFile} className="open-file-button">
              📂 Open File
            </button>
            <button onClick={handleOpenInstructions} className="open-instructions-button">
              ❓ View Instructions
            </button>
          </div>
        </div>
      )}

      {/* Image properties modal */}
      <ImagePropsModal
        open={imageModalOpen}
        initial={imageInitial}
        onCancel={() => {
          setImageModalOpen(false);
          if (imageModalResolveRef) imageModalResolveRef(null);
        }}
        onSave={(props) => {
          setImageModalOpen(false);
          if (imageModalResolveRef) imageModalResolveRef(props);
        }}
      />

      {/* Image+ modal */}
      <ImagePlusModal
        open={imagePlusOpen}
        initialPath={imagePlusPath}
        defaultWidth={preferences.default_image_width}
        defaultAlignment={preferences.default_image_alignment as ImageProps['alignment']}
        onCancel={() => setImagePlusOpen(false)}
        onChoose={(choice) => {
          setImagePlusOpen(false);
          if (!editorStateRefs.editorViewRef.current) return;
          if (choice.kind === 'figure') {
            const { path, width, alignment, caption, alt } = choice.data;
            cmd.figureWithCaption(editorStateRefs.editorViewRef.current, path, width, alignment, caption, alt);
          } else {
            const { path, width, alignment, columnText, alt, underText, position } = choice.data;
            cmd.imageWithTextColumns(editorStateRefs.editorViewRef.current, path, width, alignment, columnText, alt, underText, position);
          }
          setImagePlusPath(choice.data.path);
        }}
      />
    </div>
    </ErrorBoundary>
  );
};

export default Editor;
