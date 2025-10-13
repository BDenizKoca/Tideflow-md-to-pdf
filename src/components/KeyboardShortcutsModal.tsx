import React from 'react';
import './DesignModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
}

interface ShortcutCategory {
  category: string;
  shortcuts: Shortcut[];
}

const shortcuts: ShortcutCategory[] = [
  {
    category: 'File Operations',
    shortcuts: [
      { keys: 'Ctrl+N', description: 'New file' },
      { keys: 'Ctrl+O', description: 'Open file' },
      { keys: 'Ctrl+S', description: 'Save file' },
    ],
  },
  {
    category: 'Text Formatting',
    shortcuts: [
      { keys: 'Ctrl+B', description: 'Bold' },
      { keys: 'Ctrl+I', description: 'Italic' },
      { keys: 'Ctrl+U', description: 'Underline' },
      { keys: 'Ctrl+K', description: 'Insert link' },
      { keys: 'Ctrl+Shift+K', description: 'Insert code block' },
    ],
  },
  {
    category: 'Document Structure',
    shortcuts: [
      { keys: 'Ctrl+H', description: 'Insert heading' },
      { keys: 'Ctrl+L', description: 'Insert list' },
      { keys: 'Ctrl+Shift+Q', description: 'Insert quote' },
      { keys: 'Ctrl+Shift+T', description: 'Insert table' },
    ],
  },
  {
    category: 'View & Navigation',
    shortcuts: [
      { keys: 'Ctrl+\\', description: 'Toggle preview' },
      { keys: 'Ctrl+F', description: 'Find in document' },
      { keys: 'Ctrl+,', description: 'Open Design settings' },
    ],
  },
  {
    category: 'Export & Actions',
    shortcuts: [
      { keys: 'Ctrl+E', description: 'Export PDF' },
      { keys: 'Ctrl+R', description: 'Render/Refresh' },
    ],
  },
];

const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredShortcuts = React.useMemo(() => {
    if (!searchQuery.trim()) return shortcuts;

    const query = searchQuery.toLowerCase();
    return shortcuts
      .map(category => ({
        ...category,
        shortcuts: category.shortcuts.filter(
          shortcut =>
            shortcut.keys.toLowerCase().includes(query) ||
            shortcut.description.toLowerCase().includes(query)
        ),
      }))
      .filter(category => category.shortcuts.length > 0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay shortcuts-overlay" onClick={onClose}>
      <div className="modal-content shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </div>

        <div className="design-section">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="form-input"
          />
        </div>

        <div className="shortcuts-container">
          {filteredShortcuts.map((category) => (
            <div key={category.category} className="design-section">
              <h3>{category.category}</h3>
              <div className="shortcuts-list">
                {category.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="shortcut-item">
                    <kbd className="shortcut-keys">{shortcut.keys}</kbd>
                    <span className="shortcut-description">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredShortcuts.length === 0 && (
            <div className="no-results">
              <p>No shortcuts found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
