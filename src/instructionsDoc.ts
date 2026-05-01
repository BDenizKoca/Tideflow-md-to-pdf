// Embedded instructions document content
// This is the help guide shown on first launch and accessible via the Help button
export const INSTRUCTIONS_DOC = `<!--
  User Guide for Tideflow Markdown-to-PDF Editor
  Updated: November 2025
-->

# Tideflow User Guide

Tideflow is a distraction-free Markdown editor that renders professional PDFs in real-time. Write in simple Markdown on the left, and see your formatted document update instantly on the right.

---

## Getting Started

1.  **Open or Create:** Click **📂 Open** to load a file, or **📄 New** to start fresh.
2.  **Write:** Use standard Markdown syntax.
3.  **Preview:** The PDF preview updates automatically as you type. Toggle the preview pane with **👁️ Preview**.
4.  **Style:** Click **🎨 Design** to choose a theme or customize the layout.
5.  **Export:** Click **📄 Export** to save your PDF.

---

## Editing & Formatting

### Basic Formatting

- Text styles: **Bold** (\`Ctrl+B\`), *Italic* (\`Ctrl+I\`), <u>Underline</u> (\`Ctrl+U\`), ~~Strikethrough~~
- [Links](https://example.com) (\`Ctrl+K\`)
- Code blocks (\`Ctrl+Shift+K\`)
- Blockquotes (\`Ctrl+Shift+Q\`)

### Document Structure

- Headings: Insert headings with \`Ctrl+H\`
- Lists: Insert lists with \`Ctrl+L\`
- Tables: Insert tables with \`Ctrl+Shift+T\`
- Dividers: Insert a horizontal rule (\`---\`) or a page break

### Images & Figures

- Insert Image (🖼️): Insert an image at the cursor
- Image+ (🖼️+): Insert a figure with a caption, or create a layout with text wrapping around an image
- Resize: Use the dropdown to set the width (25%–100%) of the nearest image

### Tables & Math

- Tables (▦): Insert a standard Markdown table
- Math: Support for LaTeX math expressions

### Advanced Layouts

- Two-Column Blocks (⫴): Create a section with two parallel columns
- Alignment: Align blocks of text or images Left (⬅), Center (↔), or Right (➡)
- Footnotes (⁵): Insert a footnote reference for citations
- Vertical Space (↕): Add extra vertical spacing between elements

---

## Design & Customization

Click the **🎨 Design** button to open the styling panel.

- **Themes:** Choose from 12 built-in themes (e.g., *Academic*, *Minimal*, *Technical*) or create your own.
- **Document:** Set paper size (A4, Letter, Legal) and margins.
- **Typography:** Customize fonts and text size.
- **Structure:** Toggle a **Table of Contents** or **Cover Page**.
- **Presets:** Save your custom configurations for future use.

---

## Export Options

- **Export PDF (📄):** Save the current document as a PDF.
- **Export Clean MD:** Save a copy of your Markdown file with Tideflow-specific formatting stripped out.
- **Export Image:** Save the document as a PNG or SVG image via the dropdown menu.

---

## Troubleshooting

- **Preview Not Updating?** Press \`Ctrl+R\` (Render/Refresh) or the **🔄** button to manually refresh. Check for unclosed formatting tags (e.g., missing \`)\` in a link).
- **Images Not Showing?** Ensure the file path is correct relative to your document.
- **Layout Issues?** Check the **Design** panel (\`Ctrl+,\`) settings. Resetting to the *Default* theme often resolves layout quirks.

---

## Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **File Operations** | |
| New File | \`Ctrl+N\` |
| Open File | \`Ctrl+O\` |
| Save File | \`Ctrl+S\` |
| **Text Formatting** | |
| Bold | \`Ctrl+B\` |
| Italic | \`Ctrl+I\` |
| Underline | \`Ctrl+U\` |
| Insert Link | \`Ctrl+K\` |
| Insert Code Block | \`Ctrl+Shift+K\` |
| **Document Structure** | |
| Insert Heading | \`Ctrl+H\` |
| Insert List | \`Ctrl+L\` |
| Insert Quote | \`Ctrl+Shift+Q\` |
| Insert Table | \`Ctrl+Shift+T\` |
| **View & Navigation** | |
| Toggle Preview | \`Ctrl+Shift+P\` |
| Find in Document | \`Ctrl+F\` |
| Open Design Settings | \`Ctrl+,\` |
| **Export & Actions** | |
| Export PDF | \`Ctrl+E\` |
| Render/Refresh | \`Ctrl+R\` |

---

**Tideflow** v1.6.0
`;
