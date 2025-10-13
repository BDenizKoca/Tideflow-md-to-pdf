import { EditorView } from "@codemirror/view";
import type { ChangeSpec } from "@codemirror/state";

/**
 * Wrap the current selection with before/after text
 */
export function wrapSel(view: EditorView, before: string, after = before) {
  const s = view.state.selection.main;
  const text = view.state.sliceDoc(s.from, s.to) || "";
  view.dispatch({
    changes: { from: s.from, to: s.to, insert: before + text + after },
    selection: { anchor: s.from + before.length, head: s.from + before.length + text.length }
  });
}

/**
 * Toggle inline formatting (e.g., bold, italic) with regex detection
 * Checks BOTH the selection AND surrounding context to detect if already formatted
 */
export function toggleInline(view: EditorView, wrapper: string, re: RegExp) {
  const s = view.state.selection.main;
  let text = view.state.sliceDoc(s.from, s.to);

  // If no selection, use current word or insert placeholder
  if (!text) {
    text = "text";
  }

  // Strip Typst wrappers first to get clean content
  text = stripTypstWrappers(text);

  // Check if the selection itself is already wrapped
  const directMatch = re.exec(text);

  if (directMatch) {
    // Selection includes the markers - unwrap
    const unwrapped = directMatch[1];
    view.dispatch({
      changes: { from: s.from, to: s.to, insert: unwrapped },
      selection: { anchor: s.from, head: s.from + unwrapped.length }
    });
    return;
  }

  // Check if text is surrounded by the wrapper (user selected content but not markers)
  const wrapperLen = wrapper.length;
  const before = s.from >= wrapperLen ? view.state.sliceDoc(s.from - wrapperLen, s.from) : "";
  const after = s.to + wrapperLen <= view.state.doc.length ? view.state.sliceDoc(s.to, s.to + wrapperLen) : "";

  if (before === wrapper && after === wrapper) {
    // Already wrapped - remove the surrounding markers
    view.dispatch({
      changes: [
        { from: s.from - wrapperLen, to: s.from, insert: "" },
        { from: s.to, to: s.to + wrapperLen, insert: "" }
      ],
      selection: { anchor: s.from - wrapperLen, head: s.to - wrapperLen }
    });
  } else {
    // Not wrapped - add wrapper
    const wrapped = `${wrapper}${text}${wrapper}`;
    view.dispatch({
      changes: { from: s.from, to: s.to, insert: wrapped },
      selection: { anchor: s.from + wrapperLen, head: s.from + wrapperLen + text.length }
    });
  }
}

/**
 * Toggle prefix at the beginning of each selected line
 */
export function toggleLinePrefix(view: EditorView, prefix: string) {
  const sel = view.state.selection.main;
  const doc = view.state.doc;
  const fromLine = doc.lineAt(sel.from).number;
  const toLine = doc.lineAt(sel.to).number;
  const changes: ChangeSpec[] = [];

  for (let n = fromLine; n <= toLine; n++) {
    const line = doc.line(n);
    const has = line.text.startsWith(prefix);
    const insert = has ? line.text.slice(prefix.length) : prefix + line.text;
    changes.push({ from: line.from, to: line.to, insert });
  }

  view.dispatch({ changes });
}

/**
 * Check if current selection contains an image
 */
export function getImageAtCursor(view: EditorView): { path: string; line: number } | null {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.from);
  const imageRegex = /!\[.*?\]\((.*?)\)/;
  const match = imageRegex.exec(line.text);

  if (match) {
    return { path: match[1], line: line.number };
  }
  return null;
}

/**
 * Insert text at cursor with proper selection handling
 */
export function insertAtCursor(view: EditorView, text: string) {
  const sel = view.state.selection.main;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length }
  });
}

/**
 * Escape special characters in Typst strings
 */
export function escapeTypstString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Escape special characters in HTML
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip Typst raw wrappers to prevent nesting and parser errors
 * Removes: #text(), #align(), #block(), etc.
 */
export function stripTypstWrappers(text: string): string {
  let result = text.trim();

  // Strip any Typst raw comment wrappers: <!--raw-typst ... -->
  const rawPattern = /^<!--raw-typst\s+([\s\S]*?)\s*-->$/;
  const rawMatch = result.match(rawPattern);
  if (rawMatch) {
    result = rawMatch[1].trim();
  }

  // Strip Typst function wrappers: #func(args)[content]
  // This handles #text(), #align(), #block(), etc.
  const funcPattern = /^#\w+\([^)]*\)\[\s*([\s\S]*?)\s*\]$/;
  const funcMatch = result.match(funcPattern);
  if (funcMatch) {
    result = funcMatch[1].trim();
  }

  return result;
}

/**
 * Convert plain text to HTML paragraphs with line breaks
 */
export function htmlFromText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph
        .split(/\n/)
        .map((line) => escapeHtml(line.trim()))
        .join('<br />');
      return `<p>${lines}</p>`;
    })
    .join('\n');
}


