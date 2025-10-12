import React from 'react';
import './SearchWidget.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onSearch: (query: string, options: SearchOptions) => void;
  onReplace?: (replaceText: string) => void;
  onReplaceAll?: (searchQuery: string, replaceText: string, options: SearchOptions) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

const SearchWidget: React.FC<Props> = ({ isOpen, onClose, onSearch, onReplace, onReplaceAll, onNext, onPrevious }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [replaceText, setReplaceText] = React.useState('');
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [wholeWord, setWholeWord] = React.useState(false);
  const [showReplace, setShowReplace] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (searchQuery) {
      onSearch(searchQuery, { caseSensitive, wholeWord });
    }
  }, [searchQuery, caseSensitive, wholeWord, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey && onPrevious) {
        onPrevious();
      } else if (onNext) {
        onNext();
      }
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setReplaceText('');
    onClose();
  };

  return (
    <div className="search-widget">
      <div className="search-row">
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find"
            className="search-input"
          />
          <div className="search-controls">
            <button
              type="button"
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={`search-option ${caseSensitive ? 'active' : ''}`}
              title="Match Case"
            >
              Aa
            </button>
            <button
              type="button"
              onClick={() => setWholeWord(!wholeWord)}
              className={`search-option ${wholeWord ? 'active' : ''}`}
              title="Match Whole Word"
            >
              Ab|
            </button>
            {onPrevious && (
              <button
                type="button"
                onClick={onPrevious}
                className="search-nav"
                title="Previous (Shift+Enter)"
                disabled={!searchQuery}
              >
                ↑
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="search-nav"
                title="Next (Enter)"
                disabled={!searchQuery}
              >
                ↓
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowReplace(!showReplace)}
              className={`search-option ${showReplace ? 'active' : ''}`}
              title="Toggle Replace"
            >
              ⇄
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="search-close"
              title="Close (Esc)"
            >
              ×
            </button>
          </div>
        </div>
      </div>
      {showReplace && (
        <div className="search-row">
          <div className="search-input-container">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace"
              className="search-input"
            />
            <div className="search-controls">
              <button
                type="button"
                onClick={() => onReplace?.(replaceText)}
                className="search-action"
                title="Replace"
                disabled={!searchQuery}
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onReplaceAll?.(searchQuery, replaceText, { caseSensitive, wholeWord })}
                className="search-action"
                title="Replace All"
                disabled={!searchQuery}
              >
                All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchWidget;
