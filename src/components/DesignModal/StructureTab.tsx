import React from 'react';
import type { TabProps } from './types';
import { logger as designLogger } from '../../utils/logger';

interface StructureTabProps extends TabProps {
  handleBrowseCoverImage: () => void;
  currentFile?: string | null;
}

const StructureTab: React.FC<StructureTabProps> = ({ local, mutate, handleBrowseCoverImage, currentFile }) => {
  // Get document name from current file for default cover title
  const getDefaultCoverTitle = () => {
    if (!currentFile) return '';
    const fileName = currentFile.split(/[\\/]/).pop() || currentFile;
    return fileName.replace(/\.md$/i, '').replace(/\.markdown$/i, '');
  };

  return (
    <div className="tab-panel">
      <h3>Document Structure</h3>
      <div className="form-grid one-col">
        <label className="checkbox-label">
          <input type="checkbox" checked={local.number_sections} onChange={e => mutate({ number_sections: e.target.checked })} />
          <span>Number Sections</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label className="checkbox-label">
            <input type="checkbox" checked={local.toc} onChange={e => mutate({ toc: e.target.checked })} />
            <span>Table of Contents</span>
          </label>
          {local.toc && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={local.toc_two_column || false}
                onChange={e => mutate({ toc_two_column: e.target.checked })}
              />
              <span>Two-Column TOC</span>
            </label>
          )}
        </div>
        {local.toc && (
          <label>TOC Title
            <input
              placeholder="Leave blank for no title"
              value={local.toc_title}
              onChange={e => mutate({ toc_title: e.target.value })}
            />
            <div className="helper-text">Optional heading above the table of contents</div>
          </label>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={local.cover_page}
            onChange={e => {
              const isEnabled = e.target.checked;
              // When enabling cover page, auto-populate title if empty
              if (isEnabled && !local.cover_title) {
                const defaultTitle = getDefaultCoverTitle();
                if (defaultTitle) {
                  mutate({ cover_page: isEnabled, cover_title: defaultTitle });
                  return;
                }
              }
              mutate({ cover_page: isEnabled });
            }}
          />
          <span>Cover Page</span>
        </label>
        {local.cover_page && (
          <>
            <label>Cover Title
              <input
                placeholder="Document title"
                value={local.cover_title}
                onChange={e => mutate({ cover_title: e.target.value })}
              />
            </label>
            <label>Cover Writer
              <input
                placeholder="Author or organization"
                value={local.cover_writer}
                onChange={e => mutate({ cover_writer: e.target.value })}
              />
            </label>
            <label>Cover Image
              <div className="input-with-button">
                <input
                  placeholder="Relative path (e.g., assets/image.png)"
                  value={local.cover_image}
                  onChange={e => {
                    const newValue = e.target.value;
                    // If clearing the field, delete the old image
                    if (!newValue && local.cover_image) {
                      import('../../api').then(({ deleteFile }) => {
                        deleteFile(local.cover_image).catch(err =>
                          designLogger.warn('Failed to delete cover image', err)
                        );
                      });
                    }
                    mutate({ cover_image: newValue });
                  }}
                />
                <button
                  type="button"
                  onClick={handleBrowseCoverImage}
                >
                  Browse…
                </button>
                {local.cover_image && (
                  <button
                    type="button"
                    onClick={() => {
                      import('../../api').then(({ deleteFile }) => {
                        deleteFile(local.cover_image).catch(err =>
                          designLogger.warn('Failed to delete cover image', err)
                        );
                      });
                      mutate({ cover_image: '' });
                    }}
                    title="Clear cover image"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="helper-text">Browse to import image to assets, or provide relative path</div>
            </label>
            <label>Cover Image Width
              <div className="slider-group">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={parseInt(local.cover_image_width.replace('%', '')) || 60}
                  onChange={e => mutate({ cover_image_width: `${e.target.value}%` })}
                />
                <input
                  type="number"
                  className="slider-value-input"
                  min="10"
                  max="100"
                  step="5"
                  value={parseInt(local.cover_image_width.replace('%', '')) || 60}
                  onChange={e => mutate({ cover_image_width: `${e.target.value}%` })}
                />
              </div>
              <div className="helper-text">Size of the cover image as percentage of page width</div>
            </label>
          </>
        )}
      </div>
    </div>
  );
};

export default StructureTab;
