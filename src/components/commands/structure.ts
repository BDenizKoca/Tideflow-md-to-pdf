import { EditorView } from "@codemirror/view";
import type { ChangeSpec } from "@codemirror/state";
import { toggleLinePrefix } from "./helpers";

/**
 * Document structure commands: headings, paragraphs, lists, indentation
 */
export const structureCommands = {
  /** Toggle heading at specified level (1-3) */
  heading: (view: EditorView, level: 1 | 2 | 3) => {
    const hashes = "#".repeat(level) + " ";
    const sel = view.state.selection.main;
    const doc = view.state.doc;
    const fromLine = doc.lineAt(sel.from).number;
    const toLine = doc.lineAt(sel.to).number;
    const changes: ChangeSpec[] = [];

    for (let n = fromLine; n <= toLine; n++) {
      const line = doc.line(n);
      const stripped = line.text.replace(/^#{1,6}\s+/, "");
      const current = line.text.startsWith(hashes);
      changes.push({
        from: line.from,
        to: line.to,
        insert: current ? stripped : hashes + stripped
      });
    }
    view.dispatch({ changes });
  },

  /** Convert selected lines to normal paragraphs (remove heading/quote markers) */
  paragraph: (view: EditorView) => {
    const sel = view.state.selection.main;
    const doc = view.state.doc;
    const fromLine = doc.lineAt(sel.from).number;
    const toLine = doc.lineAt(sel.to).number;
    const changes: ChangeSpec[] = [];

    for (let n = fromLine; n <= toLine; n++) {
      const line = doc.line(n);
      const cleaned = line.text.replace(/^(#{1,6}\s+|>\s+)/, "");
      changes.push({ from: line.from, to: line.to, insert: cleaned });
    }
    view.dispatch({ changes });
  },

  /** Toggle blockquote formatting */
  quote: (view: EditorView) => toggleLinePrefix(view, "> "),

  /** Toggle unordered list */
  ul: (view: EditorView) => toggleLinePrefix(view, "- "),

  /** Toggle ordered list */
  ol: (view: EditorView) => toggleLinePrefix(view, "1. "),

  /** Toggle task list checkbox */
  task: (view: EditorView) => toggleLinePrefix(view, "- [ ] "),

  /** Indent selected lines by 2 spaces */
  indent: (view: EditorView) => {
    const sel = view.state.selection.main;
    const doc = view.state.doc;
    const fromLine = doc.lineAt(sel.from).number;
    const toLine = doc.lineAt(sel.to).number;
    const changes: ChangeSpec[] = [];

    for (let n = fromLine; n <= toLine; n++) {
      const line = doc.line(n);
      changes.push({ from: line.from, insert: "  " });
    }
    view.dispatch({ changes });
  },

  /** Outdent selected lines (remove 2 spaces or 1 tab) */
  outdent: (view: EditorView) => {
    const sel = view.state.selection.main;
    const doc = view.state.doc;
    const fromLine = doc.lineAt(sel.from).number;
    const toLine = doc.lineAt(sel.to).number;
    const changes: ChangeSpec[] = [];

    for (let n = fromLine; n <= toLine; n++) {
      const line = doc.line(n);
      const newText = line.text.startsWith("  ")
        ? line.text.slice(2)
        : line.text.replace(/^(\t)/, "");
      changes.push({ from: line.from, to: line.to, insert: newText });
    }
    view.dispatch({ changes });
  }
};
