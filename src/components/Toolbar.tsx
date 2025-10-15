import React, { useRef, useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import DesignModal from './DesignModal';
import SettingsModal from './SettingsModal';
import Dropdown from './Dropdown';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { handleError, showSuccess } from '../utils/errorHandler';
import { readMarkdownFile, createFile, writeMarkdownFile } from '../api';
import { scrubRawTypstAnchors } from '../utils/scrubAnchors';
import './Toolbar.css';

const Toolbar: React.FC = () => {
  const {
    editor,
    setCurrentFile,
    setContent,
    setModified,
    addOpenFile,
    closeAllFiles,
  } = useEditorStore();
  const {
  previewVisible,
  setPreviewVisible,
  designModalOpen,
    addToast,
    recentFiles,
    addRecentFile,
    clearRecentFiles,
    setSettingsModalOpen,
    setSettingsModalActiveTab,
  } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [recentDropdownOpen, setRecentDropdownOpen] = useState(false);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // File operations
  const handleNewFile = async () => {
    try {
      const name = prompt('Enter file name (with .md extension):');
      if (!name) return;

      const fileName = name.includes('.') ? name : `${name}.md`;
      const newContent = `# ${name.replace('.md', '')}\n\nStart writing your document.`;
      const filePath = await createFile(fileName);
      await writeMarkdownFile(filePath, newContent);

      addOpenFile(filePath);
      setCurrentFile(filePath);
      setContent(newContent);
      addRecentFile(filePath);
      addToast({ type: 'success', message: 'File created successfully' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to create file' });
      handleError(err, { operation: 'create file', component: 'Toolbar' });
    }
  };

  const handleOpenFile = async () => {
    try {
      console.log('[Toolbar] Opening file dialog...');
      const result = await open({ multiple: false, filters: [{ name: 'Markdown Files', extensions: ['md'] }] });
      const filePath = Array.isArray(result) ? result?.[0] : result;

      console.log('[Toolbar] File selected:', filePath);

      if (filePath) {
        try {
          console.log('[Toolbar] Reading file content...');
          const content = await readMarkdownFile(filePath);
          console.log('[Toolbar] File content read, length:', content.length);
          addOpenFile(filePath);
          setCurrentFile(filePath);
          setContent(content);
          addRecentFile(filePath);
          addToast({ type: 'success', message: 'File opened successfully' });
          return;
        } catch (readError) {
          console.error('[Toolbar] Failed to read file:', readError);
          addToast({ type: 'error', message: 'Failed to read file' });
          handleError(readError, { operation: 'read file', component: 'Toolbar' });
        }
      }
    } catch (err) {
      console.error('[Toolbar] Error opening file, falling back to input:', err);
      fileInputRef.current?.click();
    }
  };

  const handleSaveFile = async () => {
    const { currentFile, content, modified } = editor;
    if (!currentFile || !modified) return;

    try {
      const cleaned = scrubRawTypstAnchors(content);
      await writeMarkdownFile(currentFile, cleaned);
      setModified(false);
      addToast({ type: 'success', message: 'File saved successfully' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to save file' });
      handleError(err, { operation: 'save file', component: 'Toolbar' });
    }
  };

  const handleSaveAs = async () => {
    const { currentFile, content } = editor;
    try {
      const suggestedName = currentFile ? currentFile.split(/[\\/]/).pop() : 'document.md';
      const filePath = await save({
        defaultPath: suggestedName,
        filters: [{ name: 'Markdown Files', extensions: ['md'] }]
      });

      if (!filePath) return;

      const cleaned = scrubRawTypstAnchors(content);
      await writeMarkdownFile(filePath, cleaned);
      setCurrentFile(filePath);
      setModified(false);
      addRecentFile(filePath);
      setSaveDropdownOpen(false);
      addToast({ type: 'success', message: 'File saved successfully' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to save file' });
      handleError(err, { operation: 'save as', component: 'Toolbar' });
    }
  };

  const handleExportClean = async () => {
    const { currentFile, content } = editor;
    try {
      const baseName = currentFile ? currentFile.split(/[\\/]/).pop()?.replace('.md', '') : 'document';
      const suggestedName = `${baseName}-clean.md`;

      const filePath = await save({
        defaultPath: suggestedName,
        filters: [{ name: 'Markdown Files', extensions: ['md'] }]
      });

      if (!filePath) return;

      const cleaned = scrubRawTypstAnchors(content);
      await writeMarkdownFile(filePath, cleaned);
      setSaveDropdownOpen(false);
      addToast({ type: 'success', message: 'Clean Markdown exported successfully' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to export clean Markdown' });
      handleError(err, { operation: 'export clean', component: 'Toolbar' });
    }
  };

  const handleFallbackChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const safeName = file.name.endsWith('.md') ? file.name : file.name + '.md';
      const newPath = await createFile(safeName);
      const cleaned = scrubRawTypstAnchors(text);
      await writeMarkdownFile(newPath, cleaned);

      addOpenFile(newPath);
      setCurrentFile(newPath);
      setContent(cleaned);
      addToast({ type: 'success', message: 'File imported successfully' });
    } catch (e2) {
      addToast({ type: 'error', message: 'Failed to import file' });
      handleError(e2, { operation: 'open file', component: 'Toolbar' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTogglePreview = () => {
    setPreviewVisible(!previewVisible);
  };

  const handleExportPDF = async () => {
    try {
      const pdfSource = editor.compileStatus.pdf_path;
      if (!pdfSource) {
        handleError(new Error('No PDF available to export'),
          { operation: 'export PDF', component: 'Toolbar' }, 'warning');
        return;
      }

      // Use save dialog (if available via plugin)
      let dest = await save({
        title: 'Save PDF As',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: 'document.pdf'
      }).catch(() => null);

      if (!dest) {
        // Fallback: open dialog hack (user selects folder and we append name) - skipped for now
        return;
      }
      if (!dest.toLowerCase().endsWith('.pdf')) dest = dest + '.pdf';

      // If source is a temp PDF from in-memory render, we can copy directly.
      // Call backend command save_pdf_as which handles md->pdf export if needed.
      await invoke('save_pdf_as', { filePath: pdfSource, destination: dest });
      showSuccess(`Exported PDF to: ${dest}`);
      addToast({ type: 'success', message: 'PDF exported successfully!' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to export PDF' });
      handleError(err, { operation: 'export PDF', component: 'Toolbar' });
    }
  };

  return (
    <div className="toolbar">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.markdown"
        onChange={handleFallbackChange}
        className="hidden-file-input"
        aria-hidden="true"
      />

      <div className="toolbar-logo">
        <h1>Tideflow</h1>
      </div>

      <div className="toolbar-actions">
        {/* File Operations */}
        <div className="toolbar-section">
          {recentFiles.length > 0 ? (
            <div className="file-control-group">
              <button type="button" onClick={handleOpenFile} title="Open File (Ctrl+O)" className="file-open-btn">
                📂 Open
              </button>
              <Dropdown
                trigger={
                  <button type="button" className="dropdown-toggle" title="Recent Files">
                    ▼
                  </button>
                }
                isOpen={recentDropdownOpen}
                onToggle={() => setRecentDropdownOpen(!recentDropdownOpen)}
              >
                <div className="dropdown-header">Recent Files</div>
                {recentFiles.map((file) => (
                  <button
                    type="button"
                    key={file}
                    className="dropdown-item"
                    onClick={async () => {
                      try {
                        const content = await readMarkdownFile(file);
                        addOpenFile(file);
                        setCurrentFile(file);
                        setContent(content);
                        addRecentFile(file);
                        setRecentDropdownOpen(false);
                        addToast({ type: 'success', message: 'File opened successfully' });
                      } catch (err) {
                        addToast({ type: 'error', message: 'Failed to open file' });
                        handleError(err, { operation: 'open recent file', component: 'Toolbar' });
                      }
                    }}
                    title={file}
                  >
                    {file.split(/[\\/]/).pop() || file}
                  </button>
                ))}
                <div className="dropdown-divider"></div>
                <button
                  type="button"
                  className="dropdown-item dropdown-clear"
                  onClick={() => {
                    clearRecentFiles();
                    setRecentDropdownOpen(false);
                    addToast({ type: 'success', message: 'Recent files cleared' });
                  }}
                >
                  ✖ Clear Recent
                </button>
              </Dropdown>
            </div>
          ) : (
            <button type="button" onClick={handleOpenFile} title="Open File (Ctrl+O)">
              📂 Open
            </button>
          )}
          <button type="button" onClick={handleNewFile} title="New File (Ctrl+N)">
            📄 New
          </button>
          <button
            type="button"
            onClick={closeAllFiles}
            title="Close all tabs and return to instructions"
          >
            ✖ Close All
          </button>
        </div>

        <div className="toolbar-separator"></div>

        {/* View Controls */}
        <div className="toolbar-section">
          <button
            onClick={handleTogglePreview}
            className={previewVisible ? 'active' : 'inactive'}
            title={previewVisible ? 'Hide Preview (Ctrl+\\)' : 'Show Preview (Ctrl+\')'}
          >
            {previewVisible ? '👁️ Preview' : '👁️‍🗨️ Preview'}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="fullscreen-btn"
          >
            {isFullscreen ? '⊡ Exit' : '⛶ Fullscreen'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSettingsModalActiveTab('general');
              setSettingsModalOpen(true);
            }}
            title="Settings"
            className="toolbar-settings-btn"
          >
            ⚙️ Settings
          </button>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-section">
          <div className="file-control-group">
            <button
              type="button"
              onClick={handleSaveFile}
              disabled={!editor.modified}
              title="Save File (Ctrl+S)"
              className="file-open-btn btn-primary"
            >
              💾 Save
            </button>
            <Dropdown
              trigger={
                <button type="button" className="dropdown-toggle btn-primary" title="Save options">
                  ▼
                </button>
              }
              isOpen={saveDropdownOpen}
              onToggle={() => setSaveDropdownOpen(!saveDropdownOpen)}
              className="save-dropdown"
            >
              <button
                type="button"
                className="dropdown-item"
                onClick={handleSaveAs}
                title="Save to a different location or filename"
              >
                💾 Save As…
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={handleExportClean}
                title="Export without Typst wrappers (pure Markdown)"
              >
                ✨ Export Clean MD
              </button>
            </Dropdown>
          </div>
            <button
            type="button"
            onClick={() => {
              setSettingsModalActiveTab('about');
              setSettingsModalOpen(true);
            }}
            title="Batch Export (Pro Feature)"
            className="btn-locked btn-primary"
          >
            <div className="pro-feature-text">Batch Export</div>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!editor.compileStatus.pdf_path}
            title="Export PDF (Ctrl+E)"
            className="btn-primary"
          >
            📄 Export
          </button>
        </div>
      </div>
      {designModalOpen && <DesignModal />}
      <SettingsModal />
    </div>
  );
};

export default Toolbar;
