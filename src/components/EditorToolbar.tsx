import React from 'react';
import { EditorView } from 'codemirror';
import { cmd } from './commands';
import type { Preferences } from '../types';
import { DEFAULTS } from '../constants/timing';

// Curated font list for the dropdown
const FONT_OPTIONS = [
  "New Computer Modern",
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Palatino",
  "Garamond",
  "Source Sans Pro",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat"
];

interface EditorToolbarProps {
  currentFile: string;
  preferences: Preferences;
  selectedFont: string;
  editorView: EditorView | null;
  onRender: () => void;
  onFontChange: (font: string) => void;
  onImageInsert: () => void;
  onImagePlusOpen: () => void;
  onImageWidthChange: (width: string) => void;
  onSearchToggle: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  preferences,
  selectedFont,
  editorView,
  onRender,
  onFontChange,
  onImageInsert,
  onImagePlusOpen,
  onImageWidthChange,
  onSearchToggle,
}) => {
  return (
    <>
      {/* Simple Markdown Toolbar */}
      <div className="simple-markdown-toolbar">
        {/* Text Formatting */}
        <button onClick={() => cmd.bold(editorView!)} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button onClick={() => cmd.italic(editorView!)} title="Italic (Ctrl+I)">
          <em>I</em>
        </button>
        <button onClick={() => cmd.strike(editorView!)} title="Strikethrough">
          <s>S</s>
        </button>
        <button onClick={() => cmd.codeInline(editorView!)} title="Inline Code (Ctrl+`)">
          {'</>'}
        </button>
        <button onClick={() => cmd.link(editorView!)} title="Link (Ctrl+K)">
          🔗
        </button>

        <div className="toolbar-divider" />

        {/* Structure */}
        <button onClick={() => cmd.heading(editorView!, 1)} title="Heading 1 (Ctrl+Alt+1)">
          H1
        </button>
        <button onClick={() => cmd.heading(editorView!, 2)} title="Heading 2 (Ctrl+Alt+2)">
          H2
        </button>
        <button onClick={() => cmd.heading(editorView!, 3)} title="Heading 3 (Ctrl+Alt+3)">
          H3
        </button>
        <button onClick={() => cmd.quote(editorView!)} title="Blockquote (Ctrl+Shift+Q)">
          ""
        </button>

        <div className="toolbar-divider" />

        {/* Lists */}
        <button onClick={() => cmd.ul(editorView!)} title="Bullet List (Ctrl+Shift+8)">
          •
        </button>
        <button onClick={() => cmd.ol(editorView!)} title="Numbered List (Ctrl+Shift+7)">
          1.
        </button>
        <button onClick={() => cmd.task(editorView!)} title="Task List (Ctrl+Shift+9)">
          ☐
        </button>

        <div className="toolbar-divider" />

        {/* Alignment */}
        <button onClick={() => cmd.alignBlock(editorView!, 'left')} title="Align Left">
          ⬅
        </button>
        <button onClick={() => cmd.alignBlock(editorView!, 'center')} title="Align Center">
          ↔
        </button>
        <button onClick={() => cmd.alignBlock(editorView!, 'right')} title="Align Right">
          ➡
        </button>

        <div className="toolbar-divider" />

        {/* History */}
        <button onClick={() => cmd.undo(editorView!)} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button onClick={() => cmd.redo(editorView!)} title="Redo (Ctrl+Y)">
          ↷
        </button>

        <div className="toolbar-divider" />

        {/* Insert Content */}
        <button onClick={() => cmd.table(editorView!)} title="Insert Table">
          ▦
        </button>
        <button onClick={() => cmd.hr(editorView!)} title="Horizontal Rule">
          ―
        </button>
        <button onClick={() => cmd.footnote(editorView!)} title="Insert Footnote">
          ⁵
        </button>

        <div className="toolbar-divider" />

        {/* Force line break - Image utilities and font controls on second line */}
        <div className="toolbar-line-break" />

        <button onClick={onImageInsert} title="Insert Image">
          🖼️
        </button>
        <button onClick={onImagePlusOpen} title="Image+ (Figure with Caption)">
          🖼️+
        </button>
        <select
          className="inline-select"
          onChange={(e) => onImageWidthChange(e.target.value)}
          defaultValue={preferences.default_image_width || DEFAULTS.IMAGE_WIDTH}
          title="Image width: updates nearest image before cursor"
        >
          <option value="25%">25%</option>
          <option value="40%">40%</option>
          <option value="60%">60%</option>
          <option value="80%">80%</option>
          <option value="100%">100%</option>
        </select>

        <div className="toolbar-divider" />

        {/* Layout & Advanced */}
        <button onClick={() => cmd.columnsNoBorder(editorView!)} title="Insert 2 Columns">
          ⫴
        </button>
        <button onClick={() => cmd.pagebreak(editorView!)} title="Page Break">
          ⤓⤒
        </button>
        <button onClick={() => cmd.vspace(editorView!, '8pt')} title="Vertical Space">
          ↕
        </button>

        <div className="toolbar-divider" />

        {/* Font Controls */}
        <div className="font-control-group">
          <span className="toolbar-icon-label">Aa</span>
          <select
            value={selectedFont}
            onChange={(e) => onFontChange(e.target.value)}
            title="Apply font to selected text"
            className="toolbar-select"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => cmd.sizeLocal(editorView!, 'small')} title="Decrease Text Size">
          A−
        </button>
        <button onClick={() => cmd.sizeLocal(editorView!, 'large')} title="Increase Text Size">
          A+
        </button>

        <div className="toolbar-divider" />

        {/* Actions */}
        <button
          onClick={onSearchToggle}
          title="Find (Ctrl+F)"
        >
          🔍
        </button>
        <button
          onClick={onRender}
          title="Render PDF"
        >
          🔄
        </button>
      </div>
    </>
  );
};

export default EditorToolbar;