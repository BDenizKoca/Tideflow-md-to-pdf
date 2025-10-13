import React from 'react';
import { useUIStore } from '../stores/uiStore';
import './DesignModal.css';
import { UI } from '../constants/timing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, options: SearchOptions) => void;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

const SearchModal: React.FC<Props> = ({ isOpen, onClose, onSearch }) => {
  const addToast = useUIStore((state) => state.addToast);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [wholeWord, setWholeWord] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus search input when modal opens
      setTimeout(() => inputRef.current?.focus(), UI.MODAL_FOCUS_DELAY_MS);
    }
  }, [isOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!searchQuery.trim()) {
      addToast({ type: 'warning', message: 'Please enter a search term' });
      return;
    }

    onSearch(searchQuery, { caseSensitive, wholeWord });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔍 Find in Document</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="design-section">
            <label className="form-label">
              Search for:
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter search text..."
                className="form-input"
              />
            </label>
          </div>

          <div className="design-section">
            <h3>Options</h3>
            <div className="form-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                Match Case
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(e) => setWholeWord(e.target.checked)}
                />
                Match Whole Word
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              🔍 Find
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchModal;
