import { EditorView } from "@codemirror/view";
import { insertAtCursor, stripTypstWrappers } from "./helpers";

/**
 * Block-level commands: code blocks, tables, callouts, layouts, spacing
 */
export const blockCommands = {
  /** Insert code block with language prompt */
  codeBlock: (view: EditorView) => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "code";

    // Strip code block markers if already wrapped
    text = text.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

    const lang = prompt("Language (optional):") || "";
    view.dispatch({
      changes: {
        from: s.from,
        to: s.to,
        insert: `\`\`\`${lang}\n${text}\n\`\`\``
      }
    });
  },

  /** Insert block math equation */
  blockMath: (view: EditorView) => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "a^2 + b^2 = c^2";

    // Strip math delimiters if already wrapped
    text = text.replace(/^\$\$\n?/, '').replace(/\n?\$\$$/, '').trim();

    const block = `$$\n${text}\n$$`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Insert horizontal rule */
  hr: (view: EditorView) => {
    const s = view.state.selection.main;
    const line = view.state.doc.lineAt(s.from);
    const isAtStart = s.from === line.from;
    const prefix = isAtStart ? "" : "\n";
    const suffix = "\n";
    insertAtCursor(view, `${prefix}---${suffix}`);
  },

  /** Insert table template */
  table: (view: EditorView) => {
    const starter = `| Col 1 | Col 2 | Col 3 |
|:------|:-----:|------:|
|       |       |       |
|       |       |       |
`;
    insertAtCursor(view, starter);
  },

  /** Insert vertical space (Typst) */
  vspace: (view: EditorView, size: string = "1em") => {
    insertAtCursor(view, `<!--raw-typst #v(${size}) -->`);
  },

  /** Insert page break (Typst) */
  pagebreak: (view: EditorView) => {
    insertAtCursor(view, "<!--raw-typst #pagebreak() -->");
  },

  /** Insert footnote (Typst) */
  footnote: (view: EditorView) => {
    const s = view.state.selection.main;
    const note = prompt("Footnote text:") || "Footnote";
    const insert = `<!--raw-typst #footnote[${note}] -->`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert } });
  },

  /** Wrap selection in alignment block (Typst) */
  alignBlock: (view: EditorView, where: "left" | "center" | "right") => {
    const s = view.state.selection.main;
    let text = view.state.sliceDoc(s.from, s.to) || "Content";

    // Strip any existing Typst wrappers to prevent nesting
    text = stripTypstWrappers(text);

    const block = `<!--raw-typst #align(${where})[\n${text}\n] -->`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Insert two-column layout (Markdown table) */
  columns2: (view: EditorView) => {
    const s = view.state.selection.main;
    const right = view.state.sliceDoc(s.from, s.to) || "Right column content";
    const block = `\n| Left | Right |\n|:---- | :---- |\n| Place image here | ${right} |\n\n`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Insert columns with percentage hints (Markdown table) */
  columnsPreset: (view: EditorView, leftPct: number, rightPct: number) => {
    const s = view.state.selection.main;
    const right = view.state.sliceDoc(s.from, s.to) || "Right column content";
    const block = `\n| Left (${leftPct}%) | Right (${rightPct}%) |\n|:---- | :---- |\n| Place image here | ${right} |\n\n`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Insert columns with real width ratios (Typst grid) */
  columnsGridPreset: (view: EditorView, leftPct: number, rightPct: number) => {
    const s = view.state.selection.main;
    const right = view.state.sliceDoc(s.from, s.to) || "Right column content";
    const l = Math.max(0, Math.min(100, leftPct));
    const r = Math.max(0, Math.min(100, rightPct));
    const block = `\n<!--raw-typst #grid(columns: (${l}% + 0pt, ${r}% + 0pt), gutter: 12pt)[\n[Place image here]\n[${right}]\n] -->\n`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Insert borderless two-column layout (HTML table) */
  columnsNoBorder: (view: EditorView) => {
    const s = view.state.selection.main;
    const hadSelection = s.from !== s.to;
    const rightText = view.state.sliceDoc(s.from, s.to) || "Right column text";
    const leftText = "Left column text";
    const block = `\n<table border="0" cellspacing="0" cellpadding="0" role="presentation" data-borderless="1" style="border-collapse: collapse; border: 0">\n  <tr>\n    <td style="border: 0">${leftText}</td>\n    <td style="border: 0">${rightText}</td>\n  </tr>\n</table>\n\n`;

    let rightIdx = block.indexOf(`>${rightText}<`);
    if (rightIdx >= 0) {
      rightIdx += 1;
    } else {
      rightIdx = block.indexOf(rightText);
    }

    const insertFrom = s.from;
    const insertTo = s.to;
    let anchor = insertFrom;
    let head = insertFrom;

    if (rightIdx >= 0) {
      const startOfRight = insertFrom + rightIdx;
      if (hadSelection) {
        anchor = startOfRight + rightText.length;
        head = anchor;
      } else {
        anchor = startOfRight;
        head = startOfRight + rightText.length;
      }
    }

    view.dispatch({
      changes: { from: insertFrom, to: insertTo, insert: block },
      selection: { anchor, head }
    });
  }
};
