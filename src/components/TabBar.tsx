import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { readMarkdownFile } from '../api';
import { handleError } from '../utils/errorHandler';
import './TabBar.css';
import { INSTRUCTIONS_DOC } from '../instructionsDoc';

const TabBar: React.FC = () => {
  const {
    editor: { openFiles, currentFile, modified },
    setCurrentFile,
    setContent,
    addOpenFile,
    removeOpenFile,
  } = useEditorStore();
  const addRecentFile = useUIStore((state) => state.addRecentFile);

  const handleTabClick = async (filePath: string) => {
    if (currentFile === filePath) return;

    try {
      if (filePath === 'instructions.md') {
        // Use embedded instructions content
        setCurrentFile(filePath);
        setContent(INSTRUCTIONS_DOC);
      } else {
        const content = await readMarkdownFile(filePath);
        setCurrentFile(filePath);
        setContent(content);
        addRecentFile(filePath);
      }
    } catch (err) {
      handleError(err, { operation: 'switch to file', component: 'TabBar' });
    }
  };

  // Explicitly (re)open the instructions document
  const handleOpenInstructions = async () => {
    console.log('[TabBar] Opening instructions...');
    const instructionsName = 'instructions.md';
    addOpenFile(instructionsName);
    setCurrentFile(instructionsName);
    setContent(INSTRUCTIONS_DOC);
    console.log('[TabBar] Instructions opened, content length:', INSTRUCTIONS_DOC.length);
  };

  const handleCloseTab = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    removeOpenFile(filePath);
  };

  const getFileName = (path: string): string => {
    return path.split(/[/\\]/).pop() || path;
  };

  return (
    <div className="tab-bar">
      <div className="tab-container">
        {openFiles.map((file: string) => (
          <div
            key={file}
            className={`tab ${currentFile === file ? 'active' : ''} ${modified && currentFile === file ? 'modified' : ''}`}
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
