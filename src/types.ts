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
}

export interface CompileStatus {
  status: 'idle' | 'queued' | 'running' | 'ok' | 'error';
  message?: string;
  details?: string;
  pdf_path?: string;
  source_map?: SourceMap;
}

export type ImageAlignment = 'left' | 'center' | 'right';

export interface EditorState {
  currentFile: string | null;
  openFiles: string[];  // List of open file paths
  content: string;
  modified: boolean;
  compileStatus: CompileStatus;
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
