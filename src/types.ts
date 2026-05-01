export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export interface Margins {
  x: string;
  y: string;
}

export interface Fonts {
  main: string;
  mono: string;
}

export interface Preferences {
  theme_id: string;
  papersize: string;  // Changed from paper_size to papersize for Typst compatibility
  margin: Margins;    // Changed from margins to margin for Typst compatibility
  toc: boolean;
  toc_title: string; // empty string => no heading
  toc_two_column?: boolean; // Enable two-column TOC layout
  two_column_layout?: boolean; // Enable two-column layout for main content
  page_orientation?: 'portrait' | 'landscape'; // Page orientation
  cover_page: boolean;
  cover_title: string;
  cover_writer: string;
  cover_image: string;
  cover_image_width: string;
  number_sections: boolean;
  default_image_width: string;
  default_image_alignment: string;
  fonts: Fonts;
  font_size: number;
  page_bg_color: string;
  font_color: string;
  heading_scale: number;
  accent_color: string;
  line_height: number;
  paragraph_spacing: string;
  page_numbers: boolean;
  header_title: boolean;
  header_text: string;
  // Preview optimization settings
  render_debounce_ms: number;
  focused_preview_enabled?: boolean; // kept optional (removed in UI) for backend compatibility
  preserve_scroll_position: boolean;
  confirm_exit_on_unsaved: boolean;
  // Optional explicit path to Typst binary (used as a final fallback)
  typst_path?: string;
  // Bibliography settings
  bibliography_path?: string;        // Path to .bib or .yml file
  bibliography_style?: string;       // Citation style: "apa", "ieee", "chicago", etc.
  bibliography_title?: string;       // Custom "References" heading (optional)
  bibliography_show_all?: boolean;   // Show all entries or only cited (default: false)
}

export interface CompileStatus {
  status: 'idle' | 'queued' | 'running' | 'ok' | 'error';
  message?: string;
  details?: string;
  pdf_path?: string;
  source_map?: SourceMap;
}

export type ImageAlignment = 'left' | 'center' | 'right';

/**
 * Everything that's per-file. The store keeps one of these per open file,
 * keyed by absolute path. When the active file changes, components read a
 * different FileState — no manual reset of global state required.
 *
 * Non-serializable fields (editorState) live in memory only. The session
 * persists only the list of open paths + the active path; per-file editor
 * history, scroll positions, etc. are intentionally not persisted across
 * restarts.
 */
export interface FileState {
  path: string;
  // Document content + dirty flag
  content: string;
  modified: boolean;
  // Render output
  compileStatus: CompileStatus;
  sourceMap: SourceMap | null;
  // Sync state — which anchor we're viewing
  activeAnchorId: string | null;
  // Saved scroll positions, restored on tab switch
  editorScrollPos: number | null;
  pdfScrollPos: number | null;
  // CodeMirror state for this file (in-memory, non-serializable). Holds the
  // doc, selection, undo history, etc. EditorView.setState swaps this in on
  // tab change, giving each file its own isolated history. Typed as
  // `unknown` here so types.ts doesn't have to import @codemirror/state.
  editorState: unknown;
}

export type SyncMode = 'auto' | 'two-way' | 'locked-to-pdf' | 'locked-to-editor';

export interface EditorLocation {
  offset: number;
  line: number;
  column: number;
}

export interface PdfAnchorPosition {
  page: number;
  x: number;
  y: number;
}

export interface SourceAnchor {
  id: string;
  editor: EditorLocation;
  pdf?: PdfAnchorPosition;
}

export interface SourceMap {
  anchors: SourceAnchor[];
}

export interface BackendRenderedDocument {
  pdf_path: string;
  source_map: SourceMap;
}

export interface RenderedDocument {
  pdfPath: string;
  sourceMap: SourceMap;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
