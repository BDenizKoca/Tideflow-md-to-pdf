<!--
  Comprehensive user guide for Tideflow Markdown-to-PDF Editor
  Updated: October 2025
-->

# Tideflow: Markdown to Beautiful PDFs

Welcome to Tideflow. Write in clean, simple Markdown on the left, and see your professionally formatted PDF update live on the right. When you're ready, fine-tune the design and export a publication-ready document with one click.

This guide will get you started.

---

## The 60-Second Quick Start

1.  **Open or Type:** Click **📂 Open** to load a Markdown file, or just start typing in the blank editor.
2.  **Write Markdown:** Use standard syntax like `# Headings`, `**bold text**`, and `- lists`.
3.  **Watch the Live Preview:** The PDF on the right updates as you type. Toggle it with the **👁️ Preview** button (`Ctrl+P`).
4.  **Adjust the Design:** Click the **🎨 Design** button to open the styling panel. Choose a theme or customize fonts, margins, and colors.
5.  **Export Your PDF:** Click **📄 Export** (`Ctrl+E`) to save your finished PDF.

---

## The Tideflow Workflow

The app is split into three main activities: Writing, Styling, and Exporting.

### 1. Writing & Editing (The Left Pane)

This is your distraction-free text editor. Use the toolbar for quick formatting or write Markdown directly.

#### **Basic Formatting**

Use the toolbar or shortcuts for common actions:
- **Bold** (`Ctrl+B`), *Italic* (`Ctrl+I`), ~~Strikethrough~~
- `Inline code` (`Ctrl+\``)
- Insert a [Link](https://example.com) (`Ctrl+K`)
- Create a blockquote (`Ctrl+Shift+Q`)

#### **Document Structure**

- **Headings:** Use `H1`, `H2`, `H3` buttons or (`Ctrl+Alt+1/2/3`).
- **Lists:** Create bullet (`Ctrl+Shift+8`), numbered (`Ctrl+Shift+7`), or task lists (`Ctrl+Shift+9`).
- **Dividers:** Insert a horizontal rule (`---`) or a page break.

#### **Images & Figures**

- **Insert Image (🖼️):** Drag and drop an image or use the button. Adjust its width with the dropdown (25% - 100%).
- **Insert Figure (🖼️+):** For professional figures, this option opens a dialog to add a **caption**, precise width, and alignment.

#### **Tables & Math**

- **Tables (▦):** Insert a basic Markdown table template.
- **Math:** Write LaTeX math expressions. Use `$x$` for inline math ($E=mc^2$) and `$$` for block math, which is centered on its own line.

#### **Academic Writing & Citations**

- **Bibliography:** Add a `.bib` (BibTeX) or `.yml` (Hayagriva) file in the **🎓 Academic** tab of the Design panel to enable citations.
- **Citations:** Use Pandoc-style syntax to cite sources:
  - Simple citation: `[@einstein1905]` → (Einstein, 1905)
  - With page number: `[@darwin1859, p. 42]` → (Darwin, 1859, p. 42)
  - Multiple citations: `[@key1; @key2]` → (Author1, 2020; Author2, 2021)
- **Citation Styles:** Choose from IEEE, APA, Chicago, MLA, Vancouver, or Harvard in the Academic tab.
- **Bibliography Section:** Your references automatically appear at the end of the document.

#### **Advanced Elements**

The toolbar also gives you quick access to:
- **Footnotes** (`[^1]`)
- **Two-Column Blocks:** Make a specific part of your document flow in two columns.
- **Alignment Blocks:** Center or right-align a block of text or an image.

### 2. Styling & Previewing (The Right Pane)

The right side of your screen is a live preview of your final PDF.

#### **The Preview Window**

- **Navigation:** Zoom in/out, jump between pages, or open the **📑 Thumbnails** sidebar for a high-level view.
- **Scroll Sync (🔗):** Link the editor and preview panes so they scroll together. You can set this to be two-way (clicking the PDF jumps your cursor in the editor) or one-way (editor scrolls the PDF).

#### **The Design Panel (🎨)**

Click the **🎨 Design** button to control your document's entire look and feel.

- **Themes:** Instantly apply a professional design. Choose from 12 presets like *Academic*, *Minimal*, or *Elegant*. You can see visual thumbnails for each.
- **Document:** Set the paper size (A4, Letter), orientation, and toggle a two-column layout for the entire document.
- **Typography:** Change the main font, font size, and line height.
- **Spacing:** Adjust page margins and paragraph spacing.
- **Structure:** Automatically add a **Cover Page** or a **Table of Contents (TOC)**.
- **Academic:** Add bibliography files and configure citation styles for academic papers and research documents.
- **Presets:** Save your custom style settings to reuse in other documents.

Changes are applied live. You can drag-to-scroll through the theme gallery and other options for quick navigation.

### 3. Saving & Exporting (The Top Toolbar)

- **Save (💾 / `Ctrl+S`):** Save your `.md` file.
- **Export PDF (📄 / `Ctrl+E`):** This is the main goal. It saves the beautifully styled PDF you see in the preview.
- **Export Clean MD:** Found in the save dropdown menu, this option saves a version of your Markdown file with all special formatting codes removed, making it perfect for platforms like GitHub.

---

## Best Practices & Tips

- **Write First, Style Later:** Get all your content down in plain Markdown first. Worry about fonts, colors, and margins at the end. This is faster and keeps you focused.
- **Use One `# H1`:** Treat the `# H1` heading as your document's main title and use it only once at the top. Use `## H2` and `### H3` for subsequent sections.
- **Blank Lines Separate Everything:** Use a blank line between paragraphs, headings, lists, and other elements to ensure they render correctly.
- **Manage Images Smartly:** Keep images in a subfolder (e.g., `assets/`) to keep your project tidy. Use the **Figure (🖼️+)** tool for any image that needs a caption.
- **For Large Documents:** If the editor feels slow, hide the preview (`Ctrl+P`) while doing heavy writing and manually refresh it when you need to check the layout.

---

## Troubleshooting

- **PDF Not Updating?**
    1.  Look for an error message in the bottom status bar.
    2.  Try a manual refresh (`Ctrl+R` or the **🔄** button).
    3.  Check for unclosed formatting, like a missing `)` in a link or `$$` for a math block.
- **Image Not Showing?**
    - Double-check the file path. It's easiest to let Tideflow manage paths by dragging the image into the editor.
- **Layout Looks Wrong?**
    - Your first stop should be the **🎨 Design** panel. Check the theme, margins, and font size settings. Sometimes a small adjustment there fixes everything.

---

## Keyboard Shortcuts Reference

| Action | Shortcut |
| :--- | :--- |
| **File Operations** | |
| Save | `Ctrl+S` |
| Export PDF | `Ctrl+E` |
| Open File | `Ctrl+O` |
| Toggle Preview | `Ctrl+P` |
| **Formatting** | |
| Bold | `Ctrl+B` |
| Italic | `Ctrl+I` |
| Inline Code | `Ctrl+\`` |
| Insert Link | `Ctrl+K` |
| **Structure** | |
| Heading 1 / 2 / 3 | `Ctrl+Alt+1 / 2 / 3` |
| Bullet List | `Ctrl+Shift+8` |
| Numbered List | `Ctrl+Shift+7` |
| **Editing** | |
| Find / Replace | `Ctrl+F` / `Ctrl+H` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` |

---

## About This Document

This guide itself was created in Tideflow. It showcases:
- Comprehensive heading hierarchy
- Lists (bullet, numbered, nested)
- Tables for reference information
- Code blocks for examples
- Inline code and formatting
- Blockquotes for emphasis
- Horizontal rules for section separation
- Structured content organization

**Meta:** This document is both a user guide and a demonstration of the editor's capabilities.

---

**Version:** 2.1
**Last Updated:** December 2025
**App Version:** Tideflow 1.4

**Questions? Issues? Feedback?**
- Report issues or request features
- Share your workflows and use cases
- Contribute to documentation improvements

---

**Happy writing! Focus on the words. TideFlow will handle the layout.** ✍️
