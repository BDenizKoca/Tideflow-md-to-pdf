import { EditorView } from "@codemirror/view";
import { escapeTypstString, escapeHtml, htmlFromText } from "./helpers";

/**
 * Image-related commands: figures, captions, columns, width adjustments
 */
export const imageCommands = {
  /** Insert figure with caption using Typst */
  figureWithCaption: (
    view: EditorView,
    path: string,
    width: string,
    align: 'left' | 'center' | 'right',
    caption: string,
    alt = ''
  ) => {
    const s = view.state.selection.main;
    const sanitizedCaption = caption.trim().replace(/\n+/g, ' ');
    const captionBlock = sanitizedCaption.length > 0
      ? `caption: [${sanitizedCaption.replace(/\[/g, '(').replace(/\]/g, ')')}]`
      : '';

    const normalizedWidth = width.trim();
    let widthArg = '';
    if (normalizedWidth) {
      if (normalizedWidth.toLowerCase() === 'auto') {
        widthArg = ', width: auto';
      } else {
        widthArg = `, width: parse-length("${escapeTypstString(normalizedWidth)}")`;
      }
    }

    const altArg = alt.trim().length > 0 ? `, alt: "${escapeTypstString(alt.trim())}"` : '';
    const imageCall = `#image("${escapeTypstString(path)}"${widthArg}${altArg})`;
    const figurePrefix = captionBlock ? `#figure(${captionBlock})` : '#figure';
    const figure = `${figurePrefix}[${imageCall}]`;
    const aligned = align === 'center'
      ? `#align(center, ${figure})`
      : align === 'right'
        ? `#align(right, ${figure})`
        : figure;

    const block = `\n<!--raw-typst ${aligned} -->\n`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Insert image with text columns (HTML table) */
  imageWithTextColumns: (
    view: EditorView,
    path: string,
    width: string,
    align: 'left' | 'center' | 'right',
    columnText: string,
    alt = '',
    underText: string = '',
    position: 'image-left' | 'image-right' = 'image-left'
  ) => {
    const s = view.state.selection.main;
    const alignAttr = ` data-align="${align}"`;
    const widthAttr = width.trim().length > 0 ? ` width="${escapeHtml(width.trim())}"` : '';
    const img = `<img src="${escapeHtml(path)}" alt="${escapeHtml(alt.trim())}"${widthAttr}${alignAttr} />`;
    const underHtml = htmlFromText(underText);
    const imageBlock = underHtml
      ? `${img}\n<div data-role="image-under-text">${underHtml}</div>`
      : img;
    const columnHtml = htmlFromText(columnText) || '&nbsp;';
    const firstCell = position === 'image-left' ? imageBlock : columnHtml;
    const secondCell = position === 'image-left' ? columnHtml : imageBlock;
    const block = `\n<table border="0" cellspacing="0" cellpadding="0" role="presentation" data-borderless="1" data-layout="${position}" style="border-collapse: collapse; border: 0">\n  <tr>\n    <td style="border: 0; vertical-align: top;">${firstCell}</td>\n    <td style="border: 0; vertical-align: top;">${secondCell}</td>\n  </tr>\n</table>\n\n`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Insert figure helper for image (Typst) */
  figForImage: (view: EditorView, path: string, w = "60%", align: "left" | "center" | "right" = "center") => {
    const s = view.state.selection.main;
    const block = `<!--raw-typst #fig("${path}", w: ${w}, align: "${align}") -->`;
    view.dispatch({ changes: { from: s.from, to: s.to, insert: block } });
  },

  /** Update width attribute of nearest preceding <img> tag */
  imageWidth: (view: EditorView, width: string) => {
    const sel = view.state.selection.main;
    const doc = view.state.doc;
    const docText = doc.toString();
    const cursor = sel.from;
    const upto = docText.slice(0, cursor);
    const tagStart = upto.lastIndexOf("<img");

    if (tagStart < 0) {
      return;
    }

    const tagEnd = docText.indexOf('>', tagStart);
    if (tagEnd < 0) {
      return;
    }

    const original = docText.slice(tagStart, tagEnd + 1);
    let updated = original;
    const widthRe = /\swidth\s*=\s*(["'])(.*?)\1/;

    if (widthRe.test(updated)) {
      updated = original.replace(widthRe, (_m, q) => ` width=${q}${width}${q}`);
    } else {
      const insertAt = updated.endsWith('/>')
        ? updated.lastIndexOf('/>')
        : updated.lastIndexOf('>');
      if (insertAt > -1) {
        updated = `${updated.slice(0, insertAt)} width="${width}"${updated.slice(insertAt)}`;
      }
    }

    if (updated !== original) {
      view.dispatch({
        changes: { from: tagStart, to: tagEnd + 1, insert: updated },
        selection: { anchor: sel.anchor, head: sel.head }
      });
    }
  }
};
