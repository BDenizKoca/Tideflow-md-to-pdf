import { EditorView } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import { toggleInline, stripTypstWrappers } from "./helpers";

/**
 * Text formatting commands: bold, italic, strike, code, links, math, fonts
 */
export const formattingCommands = {
  /** Toggle bold formatting */
  bold: (view: EditorView) => toggleInline(view, "**", /^\*\*([\s\S]+)\*\*$/),

  /** Toggle italic formatting */
  italic: (view: EditorView) => toggleInline(view, "*", /^\*([\s\S]+)\*$/),

  /** Toggle strikethrough formatting */
  strike: (view: EditorView) => toggleInline(view, "~~", /^~~([\s\S]+)~~$/),

  /** Toggle underline formatting */
  underline: (view: EditorView) => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "text";

    // Strip Typst wrappers first
    text = stripTypstWrappers(text);

    // Check if already wrapped with raw-typst underline
    const typstPattern = /^<!--raw-typst\s+#underline\[([\s\S]+?)\]\s*-->$/;
    const directMatch = typstPattern.exec(text);

    if (directMatch) {
      // Unwrap - remove the Typst underline wrapper
      view.dispatch({
        changes: { from: s.from, to: s.to, insert: directMatch[1] },
        selection: { anchor: s.from, head: s.from + directMatch[1].length }
      });
      return;
    }

    // Apply underline using Typst's native function
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const wrapped = `<!--raw-typst #underline[${cleanText}] -->`;
    view.dispatch({
      changes: { from: s.from, to: s.to, insert: wrapped },
      selection: { anchor: s.from, head: s.from + wrapped.length }
    });
  },

  /** Toggle inline code formatting */
  codeInline: (view: EditorView) => toggleInline(view, "`", /^`([\s\S]+)`$/),

  /** Insert/edit link with URL prompt */
  link: (view: EditorView) => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "link";

    // Strip Typst wrappers first
    text = stripTypstWrappers(text);

    // Check if already a link [text](url) and extract parts
    const linkPattern = /^\[([^\]]+)\]\(([^)]+)\)$/;
    const linkMatch = text.match(linkPattern);

    const linkText = linkMatch ? linkMatch[1] : text;
    const currentUrl = linkMatch ? linkMatch[2] : "https://";

    const url = prompt("Enter URL:", currentUrl) || currentUrl;

    view.dispatch({
      changes: { from: s.from, to: s.to, insert: `[${linkText}](${url})` },
      selection: { anchor: s.from + `[${linkText}](`.length, head: s.from + `[${linkText}](${url}`.length }
    });
  },

  /** Toggle inline math */
  inlineMath: (view: EditorView) => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "x";

    // Strip any Typst wrappers first
    text = stripTypstWrappers(text);

    // Then toggle math delimiters
    const hasMath = /^\$(.+)\$$/.test(text);
    const result = hasMath ? text.replace(/^\$(.+)\$$/, "$1") : `$${text}$`;

    view.dispatch({
      changes: { from: s.from, to: s.to, insert: result },
      selection: { anchor: s.from + 1, head: s.from + result.length - 1 }
    });
  },

  /** Apply local font change using Typst */
  fontLocal: (view: EditorView, font: string) => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "Sample text";

    // Strip any existing Typst wrappers to prevent nesting
    text = stripTypstWrappers(text);

    const cleanText = text.replace(/\s+/g, ' ').trim();
    const rawTypstComment = `<!--raw-typst #text(font: "${font}")[${cleanText}] -->`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: rawTypstComment } });
  },

  /** Apply local size change using Typst - cycles through sizes */
  sizeLocal: (view: EditorView, direction: "small" | "normal" | "large") => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "Sample text";
    let replaceFrom = s.from;
    let replaceTo = s.to;

    // Size steps: 0.7em, 0.8em, 0.9em, normal(1em), 1.1em, 1.2em, 1.4em, 1.6em
    const sizeSteps = ["0.7em", "0.8em", "0.9em", "1em", "1.1em", "1.2em", "1.4em", "1.6em"];

    // Check if selection itself includes the wrapper
    const sizePattern = /^<!--raw-typst\s+#text\(size:\s*([^)]+)\)\[\s*([\s\S]*?)\s*\]\s*-->$/;
    const directMatch = text.match(sizePattern);

    let currentSizeValue = "1em"; // default to normal

    if (directMatch) {
      // Selection includes the wrapper
      text = directMatch[2].trim();
      currentSizeValue = directMatch[1].trim();
    } else {
      // Check if surrounded by wrapper (user selected just content)
      const docText = view.state.doc.toString();
      const beforeStart = Math.max(0, s.from - 100); // Look back up to 100 chars
      const afterEnd = Math.min(docText.length, s.to + 50); // Look ahead up to 50 chars
      const context = docText.slice(beforeStart, afterEnd);

      // Try to find wrapper around selection
      const wrapperPattern = /<!--raw-typst\s+#text\(size:\s*([^)]+)\)\[\s*([\s\S]*?)\s*\]\s*-->/g;
      let match;
      while ((match = wrapperPattern.exec(context)) !== null) {
        const wrapStart = beforeStart + match.index;
        const wrapEnd = beforeStart + match.index + match[0].length;
        const contentStart = beforeStart + match.index + match[0].indexOf('[') + 1;
        const contentEnd = beforeStart + match.index + match[0].lastIndexOf(']');

        // Check if our selection is within this wrapper's content
        if (s.from >= contentStart && s.to <= contentEnd) {
          // Found surrounding wrapper!
          currentSizeValue = match[1].trim();

          // Expand selection to include entire wrapper
          replaceFrom = wrapStart;
          replaceTo = wrapEnd;
          text = match[2].trim();
          break;
        }
      }

      if (replaceFrom === s.from) {
        // No wrapper found, strip other wrappers
        text = stripTypstWrappers(text);
      }
    }

    // Find current index in size steps
    let currentIndex = sizeSteps.indexOf(currentSizeValue);
    if (currentIndex === -1) currentIndex = 3; // default to normal (1em)

    // Calculate next size based on direction
    let nextIndex: number;
    if (direction === "small") {
      // Small button: decrease size (move left in array)
      nextIndex = Math.max(0, currentIndex - 1);
    } else {
      // Large button: increase size (move right in array)
      nextIndex = Math.min(sizeSteps.length - 1, currentIndex + 1);
    }

    const nextSizeValue = sizeSteps[nextIndex];

    // Apply the new size
    if (nextSizeValue === "1em") {
      // Normal size - remove wrapper
      view.dispatch({
        changes: { from: replaceFrom, to: replaceTo, insert: text },
        selection: { anchor: replaceFrom, head: replaceFrom + text.length }
      });
    } else {
      // Apply size wrapper
      const block = `<!--raw-typst #text(size: ${nextSizeValue})[${text}] -->`;
      view.dispatch({
        changes: { from: replaceFrom, to: replaceTo, insert: block },
        selection: { anchor: replaceFrom, head: replaceFrom + block.length }
      });
    }
  },

  /** Undo last change */
  undo: (view: EditorView) => {
    undo(view);
  },

  /** Redo last undone change */
  redo: (view: EditorView) => {
    redo(view);
  }
};
