import React, { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { readMarkdownFile } from '../api';
import { handleError } from '../utils/errorHandler';
import './TabBar.css';
import { INSTRUCTIONS_DOC } from '../instructionsDoc';

const TabBar: React.FC = () => {
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFile = useEditorStore((s) => s.activeFile);
  // Track modified-ness of the active file for the visual dot.
  const activeModified = useEditorStore((s) =>
    s.activeFile ? (s.documents[s.activeFile]?.modified ?? false) : false,
  );
  const openDocument = useEditorStore((s) => s.openDocument);
  const setActiveDocument = useEditorStore((s) => s.setActiveDocument);
  const closeDocument = useEditorStore((s) => s.closeDocument);
  const addRecentFile = useUIStore((state) => state.addRecentFile);
  const designModalOpen = useUIStore((state) => state.designModalOpen);
  const settingsModalOpen = useUIStore((state) => state.settingsModalOpen);

  const handleTabClick = useCallback(async (filePath: string) => {
    if (activeFile === filePath) return;

    try {
      // If the document is already open in our store, just switch to it —
      // its content/edits/scroll are preserved per-file. Reading from disk
      // on every tab click would discard any unsaved edits.
      const documents = useEditorStore.getState().documents;
      if (documents[filePath]) {
        setActiveDocument(filePath);
        return;
      }

      // First-time open via tab click (rare — usually files are added via
      // Open File or session restore before they appear as tabs). Fall
      // through to the read-from-disk path.
      if (filePath === 'instructions.md') {
        openDocument(filePath, INSTRUCTIONS_DOC);
        setActiveDocument(filePath);
      } else {
        const content = await readMarkdownFile(filePath);
        openDocument(filePath, content);
        setActiveDocument(filePath);
        addRecentFile(filePath);
      }
    } catch (err) {
      handleError(err, { operation: 'switch to file', component: 'TabBar' });
    }
  }, [activeFile, addRecentFile, openDocument, setActiveDocument]);

  // Explicitly (re)open the instructions document
  const handleOpenInstructions = async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[TabBar] Opening instructions...');
    }
    const instructionsName = 'instructions.md';
    openDocument(instructionsName, INSTRUCTIONS_DOC);
    setActiveDocument(instructionsName);
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[TabBar] Instructions opened, content length:', INSTRUCTIONS_DOC.length);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    closeDocument(filePath);
  };

  const openFilesRef = useRef(openFiles);
  const handleTabClickRef = useRef(handleTabClick);

  useEffect(() => {
    openFilesRef.current = openFiles;
  }, [openFiles]);

  useEffect(() => {
    handleTabClickRef.current = handleTabClick;
  }, [handleTabClick]);

  useEffect(() => {
    if (designModalOpen || settingsModalOpen) {
      return undefined;
    }

    const handleTabHotkey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }

      const index = parseInt(event.key, 10);
      if (!Number.isInteger(index) || index < 1) return;

      const files = openFilesRef.current;
      if (!files || files.length === 0) return;

      const filePath = files[index - 1];
      if (!filePath) return;

      event.preventDefault();
      const clickHandler = handleTabClickRef.current;
      if (clickHandler) {
        void clickHandler(filePath);
      }
    };

    window.addEventListener('keydown', handleTabHotkey);
    return () => {
      window.removeEventListener('keydown', handleTabHotkey);
    };
  }, [designModalOpen, settingsModalOpen]);

  const getFileName = (path: string): string => {
    return path.split(/[/\\]/).pop() || path;
  };

  return (
    <div className="tab-bar">
      <div className="tab-container">
        {openFiles.map((file: string) => (
          <div
            key={file}
            className={`tab ${activeFile === file ? 'active' : ''} ${activeModified && activeFile === file ? 'modified' : ''}`}
            onClick={() => handleTabClick(file)}
          >
            <span className="tab-name">{getFileName(file)}</span>
            {/* Allow closing sample.md, but user can now reopen via Sample button */}
            <button
              className="close-tab"
              onClick={(e) => handleCloseTab(e, file)}
              title={file === 'instructions.md' ? 'Close instructions (you can reopen with Help button)' : 'Close tab'}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="tab-actions">
        {/* Reopen instructions.md if it's not currently open */}
        {!openFiles.includes('instructions.md') && (
          <button
            onClick={handleOpenInstructions}
            className="tab-button"
            title="Open help and instructions"
          >
            ❓ Help
          </button>
        )}
      </div>
    </div>
  );
};

export default TabBar;
