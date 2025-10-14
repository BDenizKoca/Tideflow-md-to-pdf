import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { themePresets } from '../themes';
import { save } from '@tauri-apps/plugin-dialog';
import { readMarkdownFile, renderTypst, setPreferences as persistPreferences, getPreferences } from '../api';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { handleError } from '../utils/errorHandler';
import type { Preferences } from '../types';
import ThemePreview from './DesignModal/ThemePreview';
import { dropEventCoordinator } from '../utils/dropEventCoordinator';
import './DesignModal.css';
import './BatchExportModal.css';

const MAX_FILES = 50; // Sensible cap for batch export

interface FileItem {
  id: string;
  path: string;
  name: string;
}

// Helper functions for theme preview (similar to ThemesTab)
const sanitizeCssValue = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  return value.replace(/[^#%(),.\-a-zA-Z0-9\s]/g, '').trim() || fallback;
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_COLOR_REGEX = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)$/i;

const sanitizeColor = (value: string | undefined, fallback: string) => {
  const sanitized = sanitizeCssValue(value, fallback);
  if (HEX_COLOR_REGEX.test(sanitized) || RGB_COLOR_REGEX.test(sanitized)) {
    return sanitized;
  }
  return fallback;
};

const parseHex = (color: string): [number, number, number] | null => {
  const match = color.match(/^#([0-9a-fA-F]+)$/);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return [r, g, b];
};

const parseRgb = (color: string): [number, number, number] | null => {
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return [r, g, b];
};

const isColorDark = (color: string): boolean => {
  const rgb = parseHex(color) ?? parseRgb(color);
  if (!rgb) return false;
  const [r, g, b] = rgb.map((channel) => channel / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.45;
};

const parseNumeric = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const num = parseFloat(match[0]);
  return Number.isNaN(num) ? undefined : num;
};

const computeLayout = (preferences: Preferences) => {
  const marginX = parseNumeric(preferences.margin?.x) ?? 2.5;
  if (marginX <= 2) return 'dense';
  if (marginX >= 3.5) return 'spacious';
  return 'regular';
};

const parsePercentage = (value: string | undefined, fallback: number) => {
  const numeric = parseNumeric(value);
  if (numeric === undefined) return fallback;
  return Math.min(100, Math.max(20, numeric));
};

const parseHeadingScale = (scale: Preferences['heading_scale']) => {
  if (typeof scale === 'number' && Number.isFinite(scale)) {
    return scale;
  }
  if (typeof scale === 'string') {
    const numeric = parseFloat(scale);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return 1;
};

const getPreviewConfig = (preferences: Preferences) => {
  const pageColor = sanitizeColor(preferences.page_bg_color, '#f8fafc');
  const fontColor = sanitizeColor(preferences.font_color, '#1f2937');
  const accentColor = sanitizeColor(preferences.accent_color, '#2563eb');

  return {
    pageColor,
    fontColor,
    accentColor,
    isDarkPage: isColorDark(pageColor),
    twoColumn: Boolean(preferences.two_column_layout),
    layout: computeLayout(preferences) as 'dense' | 'regular' | 'spacious',
    imageWidth: parsePercentage(preferences.default_image_width, 72),
    headingScale: parseHeadingScale(preferences.heading_scale),
  };
};

export const BatchExportModal: React.FC = () => {
  const { batchExportModalOpen, setBatchExportModalOpen, addToast } = useUIStore();
  const { themeSelection, customPresets, preferences: currentPreferences } = usePreferencesStore();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedTheme, setSelectedTheme] = useState(themeSelection);
  const [outputFormat, setOutputFormat] = useState<'separate' | 'merged'>('separate');
  const [mergedFileName, setMergedFileName] = useState('merged-document.pdf');

  // Auto-generate merged filename based on first file
  useEffect(() => {
    if (files.length > 0 && outputFormat === 'merged') {
      const firstFileName = files[0].name.replace(/\.md$/i, '');
      setMergedFileName(`${firstFileName}-merged.pdf`);
    }
  }, [files, outputFormat]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentExportFile, setCurrentExportFile] = useState('');

  // Refs to avoid re-registering Tauri listener
  const filesRef = useRef(files);
  const addToastRef = useRef(addToast);

  // Update refs on every render
  filesRef.current = files;
  addToastRef.current = addToast;

  // Signal to drop event coordinator that modal is handling drops
  useEffect(() => {
    dropEventCoordinator.setModalHandling(batchExportModalOpen);
  }, [batchExportModalOpen]);

  // Listen for Tauri file drop events when modal is open
  useEffect(() => {
    if (!batchExportModalOpen) return;

    let unlisten: (() => void) | undefined;
    let lastProcessedFiles: string[] = [];
    let lastProcessedTime = 0;

    const setupListener = async () => {
      console.log('[BatchExportModal] Setting up Tauri file drop listener');

      unlisten = await listen<{ paths: string[]; position: { x: number; y: number } } | string[]>('tauri://drag-drop', async (event) => {
        console.log('[BatchExportModal] Tauri file drop event:', event.payload);

        // Handle both payload formats: object with paths property, or array directly
        const paths = (event.payload && typeof event.payload === 'object' && 'paths' in event.payload)
          ? event.payload.paths
          : Array.isArray(event.payload) ? event.payload : [];

        if (paths && paths.length > 0) {
          const now = Date.now();

          // Debounce: ignore duplicate events for the same files within 500ms
          const pathsKey = paths.join('|');
          const lastKey = lastProcessedFiles.join('|');
          if (pathsKey === lastKey && now - lastProcessedTime < 500) {
            console.log('[BatchExportModal] Ignoring duplicate file drop event');
            return;
          }

          lastProcessedFiles = paths;
          lastProcessedTime = now;

          // Filter to only .md files
          const mdFiles = paths.filter(path => path.endsWith('.md') || path.endsWith('.markdown'));

          if (mdFiles.length === 0) {
            addToastRef.current({ type: 'warning', message: 'Please drop Markdown (.md) files only' });
            return;
          }

          const currentFiles = filesRef.current;
          const availableSlots = MAX_FILES - currentFiles.length;
          const filesToAdd = mdFiles.slice(0, availableSlots);

          const newFiles: FileItem[] = filesToAdd.map(path => ({
            id: `${Date.now()}-${Math.random()}`,
            path, // Full path from Tauri
            name: path.split(/[\\/]/).pop() || path,
          }));

          setFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));

          if (mdFiles.length > availableSlots) {
            addToastRef.current({
              type: 'warning',
              message: `Maximum ${MAX_FILES} files allowed. ${mdFiles.length - availableSlots} file(s) were ignored.`
            });
          } else {
            addToastRef.current({ type: 'success', message: `Added ${newFiles.length} file(s)` });
          }
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        console.log('[BatchExportModal] Removing Tauri file drop listener');
        unlisten();
      }
    };
  }, [batchExportModalOpen]); // Only re-run when modal opens/closes

  const handleFileSelect = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        multiple: true,
        filters: [{ name: 'Markdown Files', extensions: ['md'] }]
      });

      const filePaths = Array.isArray(result) ? result : result ? [result] : [];

      if (filePaths.length === 0) return;

      const newFiles: FileItem[] = filePaths
        .slice(0, MAX_FILES - files.length)
        .map(path => ({
          id: `${Date.now()}-${Math.random()}`,
          path,
          name: path.split(/[\\/]/).pop() || path,
        }));

      setFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));

      if (filePaths.length > MAX_FILES - files.length) {
        addToast({
          type: 'warning',
          message: `Maximum ${MAX_FILES} files allowed. Additional files were ignored.`
        });
      }
    } catch (err) {
      handleError(err, { operation: 'select files', component: 'BatchExportModal' });
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFileUp = (index: number) => {
    if (index === 0) return;
    const newFiles = [...files];
    [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    setFiles(newFiles);
  };

  const moveFileDown = (index: number) => {
    if (index === files.length - 1) return;
    const newFiles = [...files];
    [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
    setFiles(newFiles);
  };

  const moveFileToTop = (index: number) => {
    if (index === 0) return;
    const newFiles = [...files];
    const [removed] = newFiles.splice(index, 1);
    newFiles.unshift(removed);
    setFiles(newFiles);
  };

  const handleExport = async () => {
    if (files.length === 0) {
      addToast({ type: 'warning', message: 'Please add at least one file to export' });
      return;
    }

    try {
      let outputFolder: string | null = null;
      let mergedFilePath: string | null = null;

      // Ask for output location first
      if (outputFormat === 'separate') {
        // Ask for output folder once
        const { open } = await import('@tauri-apps/plugin-dialog');
        outputFolder = await open({
          directory: true,
          multiple: false,
          title: 'Select Output Folder for PDFs'
        }) as string | null;

        if (!outputFolder) {
          addToast({ type: 'info', message: 'Export cancelled' });
          return;
        }
      } else {
        // Ask for merged file location
        mergedFilePath = await save({
          title: 'Save Merged PDF As',
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
          defaultPath: mergedFileName
        });

        if (!mergedFilePath) {
          addToast({ type: 'info', message: 'Export cancelled' });
          return;
        }

        if (!mergedFilePath.toLowerCase().endsWith('.pdf')) {
          mergedFilePath = `${mergedFilePath}.pdf`;
        }
      }

      // Now proceed with export
      setIsExporting(true);
      setExportProgress(0);

      // Get the selected theme preferences
      let themePrefs: Preferences;

      if (selectedTheme === 'custom') {
        // Use current preferences for custom theme
        themePrefs = currentPreferences;
      } else {
        // Try custom presets first, then theme presets, then fall back to current preferences
        const customPreset = customPresets[selectedTheme];
        const themePreset = themePresets[selectedTheme];
        themePrefs = customPreset?.preferences || themePreset?.preferences || currentPreferences;
      }

      // Store original preferences to restore later
      const originalPrefs = await getPreferences();

      // Apply selected theme temporarily
      await persistPreferences(themePrefs);

      if (outputFormat === 'separate') {
        // Export each file separately
        let successCount = 0;
        const failedFiles: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setCurrentExportFile(file.name);
          setExportProgress(((i + 1) / files.length) * 100);

          try {
            // Read file content
            const content = await readMarkdownFile(file.path);

            // Render to PDF with selected theme - IMPORTANT: pass file.path for correct asset resolution
            const rendered = await renderTypst(content, 'pdf', file.path);

            if (!rendered.pdfPath) {
              throw new Error(`Failed to render ${file.name}`);
            }

            // Save PDF to output folder
            const baseName = file.name.replace(/\.md$/i, '');
            const destination = `${outputFolder}${outputFolder?.endsWith('\\') || outputFolder?.endsWith('/') ? '' : '\\'}${baseName}.pdf`;

            await invoke('save_pdf_as', { filePath: rendered.pdfPath, destination });
            successCount++;
          } catch (err) {
            console.error(`Failed to export ${file.name}:`, err);
            failedFiles.push(file.name);
            // Continue with other files
          }
        }

        if (failedFiles.length > 0) {
          addToast({
            type: 'warning',
            message: `Exported ${successCount} of ${files.length} PDFs. Failed: ${failedFiles.join(', ')}`,
            duration: 8000
          });
        } else {
          addToast({ type: 'success', message: `Successfully exported ${successCount} PDF(s) to ${outputFolder}` });
        }
      } else {
        // Merged PDF
        setCurrentExportFile('Reading files...');
        setExportProgress(10);

        // Read all file contents with their paths for context
        const contents = await Promise.all(
          files.map(async file => {
            const content = await readMarkdownFile(file.path);
            return content;
          })
        );

        // Merge content with page breaks
        const mergedContent = contents.join('\n\n#pagebreak()\n\n');

        // Render merged document - use first file's path for asset resolution context
        setExportProgress(40);
        setCurrentExportFile('Rendering merged PDF...');
        const rendered = await renderTypst(mergedContent, 'pdf', files[0]?.path || null);

        if (!rendered.pdfPath) {
          throw new Error('Failed to render merged PDF');
        }

        // Save merged PDF
        setExportProgress(80);
        setCurrentExportFile('Saving PDF...');
        await invoke('save_pdf_as', { filePath: rendered.pdfPath, destination: mergedFilePath });
        setExportProgress(100);

        addToast({ type: 'success', message: `Successfully exported merged PDF to ${mergedFilePath}` });
      }

      // Restore original preferences
      await persistPreferences(originalPrefs);

      // Reset export state so user can export again
      setIsExporting(false);
      setExportProgress(0);
      setCurrentExportFile('');

    } catch (err) {
      setIsExporting(false);
      setExportProgress(0);
      setCurrentExportFile('');
      addToast({ type: 'error', message: 'Export failed' });
      handleError(err, { operation: 'batch export', component: 'BatchExportModal' });
    }
  };

  const handleCancel = () => {
    setBatchExportModalOpen(false);
    setFiles([]);
    setSelectedTheme(themeSelection);
    setOutputFormat('separate');
    setMergedFileName('merged-document.pdf');
    setIsExporting(false);
    setExportProgress(0);
    setCurrentExportFile('');
  };

  // Memoize custom preset entries with preview configs
  const customPresetEntries = useMemo(() => {
    return Object.entries(customPresets).map(([id, preset]) => ({
      id,
      preset,
      preview: getPreviewConfig(preset.preferences),
    }));
  }, [customPresets]);

  // Get all themes (built-in + custom) for carousel
  const allThemes = useMemo(() => {
    const builtInThemes = Object.entries(themePresets).map(([id, theme]) => ({
      id,
      name: theme.name,
      preferences: theme.preferences,
      isCustom: false as const,
      preview: undefined,
    }));

    const customThemes = customPresetEntries.map(({ id, preset, preview }) => ({
      id,
      name: preset.name,
      preferences: preset.preferences,
      isCustom: true as const,
      preview,
    }));

    return [...builtInThemes, ...customThemes];
  }, [customPresetEntries]);

  if (!batchExportModalOpen) return null;

  return (
    <div className="design-modal-overlay" onClick={handleCancel}>
      <div className="design-modal batch-export-modal" onClick={e => e.stopPropagation()}>
        <div className="design-modal-header">
          <h2>Batch Export</h2>
          <button onClick={handleCancel} title="Close" className="close-btn">✕</button>
        </div>

        <div className="batch-export-body">
          {/* File Selection Area (moved to top) */}
          <div className="batch-file-section">
            <h3>Files to Export</h3>
            <div
              className={`file-drop-zone ${files.length === 0 ? 'empty' : ''}`}
              onClick={() => files.length === 0 && handleFileSelect()}
            >
              {files.length === 0 ? (
                <div className="drop-zone-content">
                  <div className="drop-zone-icon">📁</div>
                  <p className="drop-zone-text">Drag and drop Markdown files here</p>
                  <p className="drop-zone-subtext">or click to browse</p>
                  <p className="drop-zone-limit">Maximum {MAX_FILES} files</p>
                </div>
              ) : (
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={file.id} className="file-item-wrapper">
                      <div className="file-item">
                        <span className="file-number">{index + 1}.</span>
                        <span className="file-name">{file.name}</span>
                        <div className="file-reorder-buttons">
                          {index !== 0 && (
                            <button
                              type="button"
                              className="file-reorder-btn"
                              onClick={() => moveFileToTop(index)}
                              title="Move to top"
                            >
                              ⤒
                            </button>
                          )}
                          {index !== 0 && (
                            <button
                              type="button"
                              className="file-reorder-btn"
                              onClick={() => moveFileUp(index)}
                              title="Move up"
                            >
                              ↑
                            </button>
                          )}
                          {index !== files.length - 1 && (
                            <button
                              type="button"
                              className="file-reorder-btn"
                              onClick={() => moveFileDown(index)}
                              title="Move down"
                            >
                              ↓
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => removeFile(file.id)}
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_FILES && (
                    <button
                      type="button"
                      className="add-more-btn"
                      onClick={handleFileSelect}
                    >
                      + Add More Files
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Theme Selection Carousel */}
          <div className="batch-theme-section">
            <h3>Select Theme</h3>
            <p className="helper-text">Choose the styling for your exported PDF(s)</p>
            <div className="batch-theme-carousel">
              {allThemes.map((theme) => {
                const themePrefs = theme.preferences;
                const hasTOC = themePrefs.toc === true;
                const hasCover = themePrefs.cover_page === true;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`batch-theme-card ${selectedTheme === theme.id ? 'active' : ''}`}
                    onClick={() => setSelectedTheme(theme.id)}
                    title={theme.name}
                  >
                    <div className="theme-preview">
                      {theme.isCustom && theme.preview ? (
                        <ThemePreview {...theme.preview} />
                      ) : (
                        <img
                          src={`/theme-thumbnails/${theme.id}.jpg`}
                          alt={`${theme.name} preview`}
                          className="batch-theme-thumbnail"
                        />
                      )}
                    </div>
                    <div className="batch-theme-card-info">
                      <h4>{theme.name}</h4>
                      <div className="batch-theme-badges">
                        {hasTOC && <span className="batch-theme-badge toc" title="Table of Contents enabled">TOC</span>}
                        {hasCover && <span className="batch-theme-badge cover" title="Cover Page enabled">Cover</span>}
                      </div>
                    </div>
                    {selectedTheme === theme.id && <div className="theme-card-badge">✓</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Output Format Configuration */}
          <div className="batch-config-section">
            <div className="config-group">
              <label>Output Format</label>
              <div className="batch-output-format-row">
                <div className="batch-radio-group">
                  <label className="batch-radio-option" data-active={outputFormat === 'separate'}>
                    <input
                      type="radio"
                      name="outputFormat"
                      value="separate"
                      checked={outputFormat === 'separate'}
                      onChange={() => setOutputFormat('separate')}
                    />
                    <span>Separate PDFs</span>
                  </label>
                  <label className="batch-radio-option" data-active={outputFormat === 'merged'}>
                    <input
                      type="radio"
                      name="outputFormat"
                      value="merged"
                      checked={outputFormat === 'merged'}
                      onChange={() => setOutputFormat('merged')}
                    />
                    <span>Merged PDF</span>
                  </label>
                </div>
                {outputFormat === 'merged' && (
                  <div className="batch-merged-filename-input">
                    <input
                      type="text"
                      value={mergedFileName}
                      onChange={(e) => setMergedFileName(e.target.value)}
                      placeholder="merged-document.pdf"
                      title="Output File Name"
                    />
                  </div>
                )}
              </div>
              <p className="helper-text">
                {outputFormat === 'separate'
                  ? 'Each file will be exported as an individual PDF. Cover pages and table of contents will only be included if enabled in the selected theme.'
                  : 'All files will be combined into a single PDF in the order shown below. If the selected theme has cover page or table of contents enabled, a single cover and TOC will be generated for the entire merged document.'}
              </p>
            </div>
          </div>
        </div>

        <div className="design-footer">
          {/* Progress Bar in Footer */}
          {isExporting ? (
            <div className="export-progress">
              <div className="progress-info">
                <span className="progress-label">{currentExportFile}</span>
                <span className="progress-percentage">{Math.round(exportProgress)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${exportProgress}%` }} />
              </div>
            </div>
          ) : (
            <div>
              {files.length > 0 && (
                <span className="file-count-indicator">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
              )}
            </div>
          )}
          <div className="design-footer-actions">
            <button onClick={handleCancel} type="button" className="btn-cancel" disabled={isExporting}>
              Cancel
            </button>
            <button
              onClick={handleExport}
              type="button"
              className="btn-primary"
              disabled={files.length === 0 || isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchExportModal;
