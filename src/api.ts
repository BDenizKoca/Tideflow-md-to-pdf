import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import type {
  BackendRenderedDocument,
  FileEntry,
  Preferences,
  RenderedDocument,
  SourceMap,
} from './types';

// File operations
export async function readMarkdownFile(path: string): Promise<string> {
  return invoke('read_markdown_file', { path });
}

import { scrubRawTypstAnchors } from './utils/scrubAnchors';

export async function writeMarkdownFile(path: string, content: string): Promise<void> {
  // Ensure any injected preview-only raw-typst anchors are removed before
  // persisting to disk. This centralizes scrubbing so every caller is safe.
  const cleaned = scrubRawTypstAnchors(content);
  return invoke('write_markdown_file', { path, content: cleaned });
}

export async function exportCleanMarkdown(content: string, suggestedName?: string): Promise<string | null> {
  // Export scrubbed markdown (no Typst wrappers) to a new file
  const { save } = await import('@tauri-apps/plugin-dialog');

  const filePath = await save({
    defaultPath: suggestedName,
    filters: [{ name: 'Markdown Files', extensions: ['md'] }]
  });

  if (!filePath) return null;

  const cleaned = scrubRawTypstAnchors(content);
  await invoke('write_markdown_file', { path: filePath, content: cleaned });
  return filePath;
}

export async function listFiles(dirPath = ''): Promise<FileEntry[]> {
  return invoke('list_files', { dirPath });
}

export async function createFile(
  name: string,
  template?: string,
  dirPath?: string
): Promise<string> {
  return invoke('create_file', { name, template, dirPath });
}

export async function deleteFile(path: string): Promise<void> {
  return invoke('delete_file', { path });
}

export async function renameFile(oldPath: string, newName: string): Promise<string> {
  return invoke('rename_file', { oldPath, newName });
}

// Image operations
export async function importImage(
  imageData: string,
  fileName?: string
): Promise<string> {
  // IMPORTANT: Rust command parameters are snake_case (image_data, file_name).
  // Previous camelCase keys caused silent failure (no image inserted on drag/drop or paste).
  return invoke('import_image', { image_data: imageData, file_name: fileName });
}

// Import an image from a filesystem path by copying it into the app's assets directory.
export async function importImageFromPath(sourcePath: string): Promise<string> {
  // Send both camelCase and snake_case to be safe across bindings
  return invoke('import_image_from_path', { sourcePath, source_path: sourcePath });
}

// Rendering operations
export async function renderMarkdown(filePath: string): Promise<RenderedDocument> {
  const raw = await invoke<BackendRenderedDocument>('render_markdown', { filePath });
  return normalizeRenderedDocument(raw);
}

// Latest-wins coalesced render queue for Typst
// Proper queue management with generation tracking to prevent race conditions
interface RenderArgs {
  content: string;
  format: string;
  currentFile?: string;
}

interface RenderQueueState {
  inFlight: boolean;
  pending: RenderArgs | null;
  currentGeneration: number;
  subscribers: Map<number, { resolve: (doc: RenderedDocument) => void; reject: (err: unknown) => void }>;
}

const renderQueue: RenderQueueState = {
  inFlight: false,
  pending: null,
  currentGeneration: 0,
  subscribers: new Map(),
};

function normalizeSourceMap(map: SourceMap | undefined): SourceMap {
  if (!map) {
    return { anchors: [] };
  }
  if (!Array.isArray(map.anchors)) {
    return { anchors: [] };
  }
  return {
    anchors: map.anchors.map((anchor) => ({
      id: anchor.id,
      editor: anchor.editor,
      pdf: anchor.pdf,
    })),
  };
}

function normalizeRenderedDocument(doc: BackendRenderedDocument): RenderedDocument {
  return {
    pdfPath: doc.pdf_path,
    sourceMap: normalizeSourceMap(doc.source_map),
  };
}

async function invokeRenderTypst(args: RenderArgs): Promise<RenderedDocument> {
  const result: BackendRenderedDocument = await invoke('render_typst', {
    content: args.content,
    format: args.format,
    currentFile: args.currentFile
  });
  return normalizeRenderedDocument(result);
}

async function processRenderQueue(): Promise<void> {
  if (renderQueue.inFlight) return;

  renderQueue.inFlight = true;

  try {
    while (renderQueue.pending) {
      const args = renderQueue.pending;
      renderQueue.pending = null;

      try {
        const document = await invokeRenderTypst(args);

        // If no new requests came in, resolve all subscribers
        if (!renderQueue.pending) {
          const subscribers = new Map(renderQueue.subscribers);
          renderQueue.subscribers.clear();
          renderQueue.currentGeneration++;

          subscribers.forEach(({ resolve }) => resolve(document));
          break;
        }
        // Otherwise continue loop with new pending request
      } catch (err) {
        // If error and no pending retry, fail all subscribers
        if (!renderQueue.pending) {
          const subscribers = new Map(renderQueue.subscribers);
          renderQueue.subscribers.clear();
          renderQueue.currentGeneration++;

          subscribers.forEach(({ reject }) => reject(err));
          break;
        }
        // Otherwise continue loop with pending retry
      }
    }
  } finally {
    renderQueue.inFlight = false;
  }
}

export function renderTypst(content: string, format: string, currentFile?: string | null): Promise<RenderedDocument> {
  const args: RenderArgs = { content, format, currentFile: currentFile || undefined };

  // Update pending with latest content (last one wins)
  renderQueue.pending = args;

  // Create a new subscriber promise
  const generation = renderQueue.currentGeneration;
  const promise = new Promise<RenderedDocument>((resolve, reject) => {
    renderQueue.subscribers.set(generation + renderQueue.subscribers.size, { resolve, reject });
  });

  // Start processing if not already running
  processRenderQueue();

  return promise;
}

export async function exportMarkdown(filePath: string): Promise<string> {
  return invoke('export_markdown', { filePath });
}

// Preferences operations
interface BackendPreferences {
  theme_id?: string;
  papersize: string;
  margin: { x: string; y: string };
  toc: boolean;
  toc_title?: string;
  toc_two_column?: boolean;
  two_column_layout?: boolean;
  cover_page?: boolean;
  cover_title?: string;
  cover_writer?: string;
  cover_image?: string;
  cover_image_width?: string;
  numberSections?: boolean; // backend serialized camelCase
  number_sections?: boolean; // tolerate snake just in case
  default_image_width: string;
  default_image_alignment: string;
  fonts: { main: string; mono: string };
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
  render_debounce_ms: number;
  focused_preview_enabled?: boolean;
  preserve_scroll_position: boolean;
  confirm_exit_on_unsaved?: boolean;
  // Optional typst_path forwarded from backend
  typst_path?: string;
}

export async function getPreferences(): Promise<Preferences> {
  const raw = await invoke<BackendPreferences>('get_preferences');
  return {
    theme_id: raw.theme_id ?? 'default',
    papersize: raw.papersize,
    margin: raw.margin,
    toc: raw.toc,
    toc_title: raw.toc_title ?? '',
    cover_page: raw.cover_page ?? false,
    cover_title: raw.cover_title ?? '',
    cover_writer: raw.cover_writer ?? '',
    cover_image: raw.cover_image ?? '',
    cover_image_width: raw.cover_image_width ?? '60%',
    number_sections: raw.numberSections ?? raw.number_sections ?? true,
    default_image_width: raw.default_image_width,
    default_image_alignment: raw.default_image_alignment,
    fonts: raw.fonts,
    font_size: raw.font_size ?? 11,
    page_bg_color: raw.page_bg_color ?? '#ffffff',
    font_color: raw.font_color ?? '#000000',
    heading_scale: raw.heading_scale ?? 1.0,
    accent_color: raw.accent_color ?? '#1e40af',
    line_height: raw.line_height ?? 1.5,
    paragraph_spacing: raw.paragraph_spacing ?? '0.65em',
    page_numbers: raw.page_numbers ?? false,
    header_title: raw.header_title ?? false,
    header_text: raw.header_text ?? '',
    render_debounce_ms: raw.render_debounce_ms ?? 400,
    focused_preview_enabled: raw.focused_preview_enabled,
    preserve_scroll_position: raw.preserve_scroll_position,
    confirm_exit_on_unsaved: raw.confirm_exit_on_unsaved ?? true,
    // Optional typst_path is forwarded from the backend
    typst_path: raw.typst_path ?? undefined,
  };
}

export async function setPreferences(preferences: Preferences): Promise<void> {
  const outbound: BackendPreferences = {
    theme_id: preferences.theme_id,
    papersize: preferences.papersize,
    margin: preferences.margin,
    toc: preferences.toc,
    toc_title: preferences.toc_title,
    toc_two_column: preferences.toc_two_column,
    two_column_layout: preferences.two_column_layout,
    cover_page: preferences.cover_page,
    cover_title: preferences.cover_title,
    cover_writer: preferences.cover_writer,
    cover_image: preferences.cover_image,
    cover_image_width: preferences.cover_image_width,
    numberSections: preferences.number_sections, // Send as numberSections for Rust
    default_image_width: preferences.default_image_width,
    default_image_alignment: preferences.default_image_alignment,
    fonts: preferences.fonts,
    font_size: preferences.font_size,
    page_bg_color: preferences.page_bg_color,
    font_color: preferences.font_color,
    heading_scale: preferences.heading_scale,
    accent_color: preferences.accent_color,
    line_height: preferences.line_height,
    paragraph_spacing: preferences.paragraph_spacing,
    page_numbers: preferences.page_numbers,
    header_title: preferences.header_title,
    header_text: preferences.header_text,
    render_debounce_ms: preferences.render_debounce_ms,
    focused_preview_enabled: preferences.focused_preview_enabled,
    preserve_scroll_position: preferences.preserve_scroll_position,
    confirm_exit_on_unsaved: preferences.confirm_exit_on_unsaved,
    // Forward typst_path to backend if present
    typst_path: preferences.typst_path,
  };
  await invoke('set_preferences', { preferences: outbound });
}

export async function applyPreferences(): Promise<void> {
  return invoke('apply_preferences');
}

// Cache management operations
export async function getCacheStats(): Promise<{
  cached_documents: number;
  cache_size_mb: number;
  cache_hits: number;
  cache_misses: number;
}> {
  return invoke('get_cache_stats');
}

export async function clearRenderCache(): Promise<void> {
  return invoke('clear_render_cache');
}

// Debug operations
export interface DebugPathsInfo {
  content_dir: string;
  build_dir: string;
  prefs_path: string;
  build_prefs_path: string;
  prefs_json: unknown;
  build_prefs_json?: unknown;
}

export async function debugPaths(): Promise<DebugPathsInfo> {
  return invoke('debug_paths');
}

export async function typstDiagnostics(): Promise<{
  detected_binary: string | null;
  attempted_binary_paths: string[];
  error: string | null;
}> {
  return invoke('typst_diagnostics');
}

// Dialog operations
export async function showOpenDialog(
  filters?: { name: string; extensions: string[] }[],
  directory = false
): Promise<string | null> {
  try {
    // Ensure the dialog plugin is loaded and available
    if (typeof open !== 'function') {
      throw new Error('Dialog plugin not available');
    }

    // Use more specific type annotation to help TypeScript
    const dialogOptions: {
      multiple?: boolean;
      directory?: boolean;
      filters?: { name: string; extensions: string[] }[];
    } = {
      multiple: false,
      directory
    };

    if (filters && filters.length > 0) {
      dialogOptions.filters = filters;
    }

    const result = await open(dialogOptions);

    if (result === null) {
      return null;
    }

    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    } else {
      return result || null;
    }
  } catch (err) {
    console.error('[API] showOpenDialog failed:', err);
    return null;
  }
}

// Event listeners
export async function listenForFileChanges(
  callback: (filePath: string) => void
): Promise<UnlistenFn> {
  // This returns an unlisten function
  return listen('file-changed', (event) => {
    callback(event.payload as string);
  });
}

// Helper for generating Markdown image syntax
export function generateImageMarkdown(
  path: string,
  width: string = '60%',
  alignment: string = 'center',
  altText: string = ''
): string {
  // Use HTML <img> so our Typst template's cmarker html override can apply width and alignment.
  // Alignment is provided via data-align to avoid conflicting with HTML align defaults.
  const trimmedWidth = width.trim();
  const trimmedAlignment = alignment.trim() || 'center';
  const widthAttr = trimmedWidth.length > 0 ? ` width="${trimmedWidth}"` : '';

  // Escape special characters in both path and alt text for HTML safety
  const safePath = path
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/#/g, '%23');  // Escape # to prevent Typst interpretation

  const safeAlt = altText
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return `<img src="${safePath}" alt="${safeAlt}"${widthAttr} data-align="${trimmedAlignment}" />`;
}

// Cleanup operations
export async function cleanupTempPdfs(keepLastN?: number): Promise<{
  files_removed: number;
  total_space_freed: number;
}> {
  return invoke('cleanup_temp_pdfs', { keepLastN });
}

// Open PDF in system viewer for printing or viewing
export async function openPdfInViewer(pdfPath: string): Promise<void> {
  return invoke('open_pdf_in_viewer', { pdfPath });
}
