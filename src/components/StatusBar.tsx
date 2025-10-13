import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import './StatusBar.css';

const StatusBar: React.FC = () => {
  const { editor, scrollLocked } = useEditorStore();
  const preferences = usePreferencesStore((state) => state.preferences);
  const { currentFile, modified, compileStatus, content } = editor;

  // Calculate word and character counts
  const wordCount = content ? content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const charCount = content ? content.length : 0;

  const getStatusText = () => {
    if (!currentFile) {
      return 'No file open';
    }

    if (compileStatus.status === 'running') {
      return 'Rendering PDF...';
    }

    if (compileStatus.status === 'error') {
      return 'Render failed - check preview for details';
    }

    if (modified) {
      return 'Unsaved changes';
    }

    return 'Ready';
  };

  const getStatusClass = () => {
    if (compileStatus.status === 'error') {
      return 'status-error';
    }

    if (compileStatus.status === 'running') {
      return 'status-running';
    }

    if (modified) {
      return 'status-modified';
    }

    return 'status-ok';
  };

  return (
    <div className="status-bar">
      <div className={`status-indicator ${getStatusClass()}`}>
        {getStatusText()}
        {currentFile && (
          <span className="status-counts">
            • {wordCount.toLocaleString()} words • {charCount.toLocaleString()} chars
          </span>
        )}
      </div>

      <div className="status-info">
        {scrollLocked && (
          <span className="status-item status-scroll-locked">
            Scroll Locked
          </span>
        )}
        <span className="status-item">
          Paper: {preferences.papersize.toUpperCase()}
        </span>
        <span className="status-item">
          Margins: {preferences.margin.x} × {preferences.margin.y}
        </span>
        <span className="status-item">
          TOC: {preferences.toc ? 'On' : 'Off'}
        </span>
        <span className="status-item">
          Cover: {preferences.cover_page ? 'On' : 'Off'}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
