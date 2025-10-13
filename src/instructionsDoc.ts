// Embedded instructions document content
// This is the help guide shown on first launch and accessible via the Help button
export const INSTRUCTIONS_DOC = `<!--
  Comprehensive user guide for Tideflow Markdown-to-PDF Editor
  Updated: October 2025
-->

# Tideflow: Markdown to Beautiful PDFs

Welcome to Tideflow. Write in clean, simple Markdown on the left, and see your professionally formatted PDF update live on the right. When you're ready, fine-tune the design and export a publication-ready document with one click.

This guide will get you started.

---

## The 60-Second Quick Start

1.  **Open or Type:** Click **📂 Open** to load a Markdown file, or just start typing in the blank editor.
2.  **Write Markdown:** Use standard syntax like \`# Headings\`, \`**bold text**\`, and \`- lists\`.
3.  **Watch the Live Preview:** The PDF on the right updates as you type. Toggle it with the **👁️ Preview** button (\`Ctrl+P\`).
4.  **Adjust the Design:** Click the **🎨 Design** button to open the styling panel. Choose a theme or customize fonts, margins, and colors.
5.  **Export Your PDF:** Click **📄 Export** (\`Ctrl+E\`) to save your finished PDF.

---

## The Tideflow Workflow

The app is split into three main activities: Writing, Styling, and Exporting.

### 1. Writing & Editing (The Left Pane)

This is your distraction-free text editor. Use the toolbar for quick formatting or write Markdown directly.

#### **Basic Formatting**

Use the toolbar or shortcuts for common actions:
- **Bold** (\`Ctrl+B\`), *Italic* (\`Ctrl+I\`), ~~Strikethrough~~
- \`Inline code\` (\`Ctrl+\\\`\`)
- Insert a [Link](https://example.com) (\`Ctrl+K\`)
- Create a blockquote (\`Ctrl+Shift+Q\`)

#### **Document Structure**

- **Headings:** Use \`H1\`, \`H2\`, \`H3\` buttons or (\`Ctrl+Alt+1/2/3\`).
- **Lists:** Create bullet (\`Ctrl+Shift+8\`), numbered (\`Ctrl+Shift+7\`), or task lists (\`Ctrl+Shift+9\`).
- **Dividers:** Insert a horizontal rule (\`---\`) or a page break.

#### **Images & Figures**

- **Insert Image (🖼️):** Drag and drop an image or use the button. Adjust its width with the dropdown (25% - 100%).
- **Insert Figure (🖼️+):** For professional figures, this option opens a dialog to add a **caption**, precise width, and alignment.

#### **Tables & Math**

- **Tables (▦):** Insert a basic Markdown table template.
- **Math:** Write LaTeX math expressions. Use \`$x$\` for inline math ($E=mc^2$) and \`$$\` for block math, which is centered on its own line.

#### **Advanced Elements**

The toolbar also gives you quick access to:
- **Footnotes** (\`[^1]\`)
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
- **Presets:** Save your custom style settings to reuse in other documents.

Changes are applied live. You can drag-to-scroll through the theme gallery and other options for quick navigation.

### 3. Saving & Exporting (The Top Toolbar)

- **Save (💾 / \`Ctrl+S\`):** Save your \`.md\` file.
- **Export PDF (📄 / \`Ctrl+E\`):** This is the main goal. It saves the beautifully styled PDF you see in the preview.
- **Export Clean MD:** Found in the save dropdown menu, this option saves a version of your Markdown file with all special formatting codes removed, making it perfect for platforms like GitHub.

---

## Best Practices & Tips

- **Write First, Style Later:** Get all your content down in plain Markdown first. Worry about fonts, colors, and margins at the end. This is faster and keeps you focused.
- **Use One \`# H1\`:** Treat the \`# H1\` heading as your document's main title and use it only once at the top. Use \`## H2\` and \`### H3\` for subsequent sections.
- **Blank Lines Separate Everything:** Use a blank line between paragraphs, headings, lists, and other elements to ensure they render correctly.
- **Manage Images Smartly:** Keep images in a subfolder (e.g., \`assets/\`) to keep your project tidy. Use the **Figure (🖼️+)** tool for any image that needs a caption.
- **For Large Documents:** If the editor feels slow, hide the preview (\`Ctrl+P\`) while doing heavy writing and manually refresh it when you need to check the layout.

---

## Troubleshooting

- **PDF Not Updating?**
    1.  Look for an error message in the bottom status bar.
    2.  Try a manual refresh (\`Ctrl+R\` or the **🔄** button).
    3.  Check for unclosed formatting, like a missing \`)\` in a link or \`$$\` for a math block.
- **Image Not Showing?**
    - Double-check the file path. It's easiest to let Tideflow manage paths by dragging the image into the editor.
- **Layout Looks Wrong?**
    - Your first stop should be the **🎨 Design** panel. Check the theme, margins, and font size settings. Sometimes a small adjustment there fixes everything.

---

## Keyboard Shortcuts Reference

| Action | Shortcut |
| :--- | :--- |
| **File Operations** | |
| Save | \`Ctrl+S\` |
| Export PDF | \`Ctrl+E\` |
| Open File | \`Ctrl+O\` |
| Toggle Preview | \`Ctrl+P\` |
| **Formatting** | |
| Bold | \`Ctrl+B\` |
| Italic | \`Ctrl+I\` |
| Inline Code | \`Ctrl+\\\`\` |
| Insert Link | \`Ctrl+K\` |
| **Structure** | |
| Heading 1 / 2 / 3 | \`Ctrl+Alt+1 / 2 / 3\` |
| Bullet List | \`Ctrl+Shift+8\` |
| Numbered List | \`Ctrl+Shift+7\` |
| **Editing** | |
| Find / Replace | \`Ctrl+F\` / \`Ctrl+H\` |
| Undo / Redo | \`Ctrl+Z\` / \`Ctrl+Y\` |

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

**Version:** 2.0
**Last Updated:** December 2024
**App Version:** Tideflow 1.0

**Questions? Issues? Feedback?**
- Report issues or request features
- Share your workflows and use cases
- Contribute to documentation improvements

---

**Happy writing! Focus on the words. TideFlow will handle the layout.** ✍️

---

## 1. The Big Idea (Why this exists)
Plain text stays future‑proof. Markdown keeps you fast. Typst gives you professional layout tricks. This editor stitches them together so you can:
- Stay in one window (edit + design + preview)
- Keep flow while still seeing the final document
- Add structure (figures, math, columns, footnotes) without fighting a word processor
- Nudge visual design when needed — not obsess over it up front

---

## 2. Core Concepts (Good to know early)
| Concept | What It Means |
|---------|---------------|
| Source vs PDF | Left pane = editable Markdown+Typst wrappers. Right pane = rendered PDF snapshot. |
| Live-ish Render | Renders after short pauses in typing (debounced). Manual triggers still possible. |
| Sync Modes | One-way = editor drives PDF. Two-way = clicking/scrolling PDF jumps editor too. |
| Raw Typst Wrappers | Little HTML comments like \`<!--raw-typst #figure[...] -->\` inserted for features Markdown doesn't natively support. |
| Virtual File | The help document (this one) and new unsaved tabs until you save them. |
| Sessions | Open tabs + preferences restore next launch. |

---

## 3. Quick Start
1. Click Open (📂) or just start a New tab.
2. Type a heading, a paragraph, maybe a list.
3. Glance right to make sure layout feels right.
4. Drop in an image or add inline math if needed.
5. Adjust theme or margins later — don't stall on design first.

That's it. You're already "using the system."

---

## 4. Workspace Tour
### Tabs & Files
- Tabs sit top-left. Middle‑click or use Close to remove.
- Recent list helps reopen things fast.
- Help button (❓) appears only when this guide isn't open.

### Editor Pane (Left)
- Syntax highlighting, soft wrapping, multi-line selections.
- Keyboard shortcuts for nearly everything (see bottom cheat sheet).
- Inline and block math supported.

### PDF Pane (Right)
- Click a paragraph to jump the editor.
- Zoom controls: − / % / + / Reset.
- Page thumbnails (📑) toggle.
- Print (🖨️) opens the generated PDF externally (then you print there).

### Design & Theme
- 🎨 opens design modal (structure + cover + spacing + fonts).
- Theme dropdown switches presets; choosing "Custom…" captures a snapshot you can tweak.
- A− / A+ adjust base font size quickly.

### Sync & Scroll
- ⇅ / ⇊ toggles two‑way vs one‑way mode.
- 🔗 enables scroll coupling; ⛓️‍💥 breaks it temporarily.

### Toolbars (Formatting Flow)
1. Text styling: **B I S \`</>\` 🔗**
2. Structure: H1 H2 H3 Quote
3. Lists & nesting: • 1. ☐ → ←
4. Math: $x$  $$
5. History: ↶ ↷
6. Inserts & helpers: divider, em dash, super/sub, images, image+
7. Extras: image width default, footnote, TOC toggle, add tab, font picker

### Modals
- Image+ (detailed figure, alignment, caption)
- Image Props (tweak width of nearest previous image tag)
- Search (Ctrl+F) / Replace (Ctrl+H)
- Keyboard Shortcuts overview
- Design & Preferences combined styling surface

---

## 5. Writing & Formatting (Everyday stuff)
| Action | How | Result |
|--------|-----|--------|
| Bold | Ctrl+B or toolbar | \`**text**\` |
| Italic | Ctrl+I | \`*text*\` |
| Strike | Button S | \`~~text~~\` |
| Inline code | Ctrl+\\\` | \\\`\\\`code\\\`\\\` |
| Link | Ctrl+K | \`[label](https://…)\` prompt |
| Heading 1/2/3 | Ctrl+Alt+1/2/3 | Adds / toggles \`#\`, \`##\`, \`###\` |
| Quote | Ctrl+Shift+Q | \`> \` prefix toggle |
| Bullet list | Ctrl+Shift+8 | \`- \` lines toggle |
| Numbered list | Ctrl+Shift+7 | \`1. \` pattern toggle |
| Task list | Ctrl+Shift+9 | \`- [ ] \` toggle |
| Indent / Outdent | → / ← buttons | Adds / removes leading spaces |
| Horizontal rule | ▦ | Inserts \`---\` |
| Superscript / Subscript | ⤓⤒ / ↕ | Wrap with Typst or inline pattern |
| Undo / Redo | Ctrl+Z / Ctrl+Y | History travel |

Tip: If something toggles weirdly, check you didn't include leading/trailing spaces in selection.

---

## 6. Math (Keep it readable)
- Inline: \`$a^2 + b^2$\` — short expressions inside sentences.
- Block:
  \\\`\\\`\\\`
  $$
  E = mc^2
  $$
  \\\`\\\`\\\`
- Keep block math on its own blank lines above and below.
- Don't overuse math for plain text — readability first.

---

## 7. Images & Figures
| Feature | Use When | How |
|---------|----------|-----|
| Basic image | Simple inline illustration | 🖼️ button → select file or drop into editor |
| Figure with caption | You need alignment / caption | 🖼️+ → fill form → inserts Typst wrapper |
| Image + text columns | Side-by-side layout | Image+ with column option or columns helper |
| Adjust width | Tweak last image | Change default width or use Image Props |
| Under‑image text | Additional explanation | Fill "under text" in Image+ modal |

Accessibility: Always add meaningful alt text unless decorative.

---

## 8. Layout & Advanced Blocks
- Tables: start simple; refine later. Basic Markdown table templates are fastest.
- Columns: use preset or Typst grid for controllable proportional layouts.
- Page break: Insert when starting a major section you want isolated.
- Vertical space: Use sparingly; content hierarchy should carry spacing.
- Footnotes: Great for citations or side remarks. Don't turn them into mini essays.
- Alignment block: Center or right align a block without abusing spaces.
- Avoid nesting wrappers inside wrappers unless absolutely needed (clean edits later).

---

## 9. Themes, Design & Typography
You can ignore design until content stabilizes. When ready:
1. Pick a preset that's "close."
2. Switch to Custom if you need to fine‑tune.
3. Adjust margins, fonts, line height, optional TOC, cover page.
4. Re‑render happens automatically after changes (short delay).

Font size matters more than font family; choose readability over novelty.

---

## 10. Sync & Navigation
- One-way (⇊): Editor drives; PDF scroll is passive.
- Two-way (⇅): Scroll or click either side to follow along.
- Scroll link (🔗) off? You can compare distant sections manually.
- Thumbnails help when scanning structure.

If jumps feel off, ensure headings are properly spaced (blank line before).

---

## 11. Rendering, Saving & PDF
- Saving (Ctrl+S) writes the source + triggers a render when needed.
- PDF path appears after successful compile; printing opens it externally.
- If something doesn't appear: check syntax (unclosed code fences often block renders).

---

## 12. Preferences & Persistence
The app remembers:
- Open tabs
- Last selected theme / custom snapshot
- Default image width
- Sync mode

If you want a "clean slate," Close All then reopen only what matters.

---

## 13. Keyboard Shortcuts (Essentials)
| Category | Shortcut | Action |
|----------|----------|--------|
| File | Ctrl+O | Open file |
|  | Ctrl+S | Save |
|  | Ctrl+Shift+S | Save As |
| Editing | Ctrl+B / I | Bold / Italic |
|  | Ctrl+\\\` | Inline code |
|  | Ctrl+K | Link prompt |
| Structure | Ctrl+Alt+1/2/3 | H1 / H2 / H3 |
| Lists | Ctrl+Shift+8/7/9 | Bullet / Number / Task |
| Quote | Ctrl+Shift+Q | Toggle blockquote |
| Blocks | Ctrl+Shift+C | Code block |
| Nav | Ctrl+F / H | Find / Replace |
| Undo/Redo | Ctrl+Z / Y | Undo / Redo |
| Render | Ctrl+R | Manual render trigger |
| View | F11 | Fullscreen |

---

## 14. Markdown Best Practices (Makes life easier later)
1. One H1 per document (title). Don't skip heading levels.
2. Blank line between paragraphs, lists, and headings.
3. Keep lists tight: avoid stray trailing spaces.
4. Tables: start minimal; align columns only when stable.
5. Image widths: be consistent (e.g., 60% for medium, 100% for full-width banners).
6. Avoid giant inline math; move long expressions to block form.
7. Limit bold to labels and emphasis; italic for nuance.
8. Use footnotes for references, not entire paragraphs.
9. Review raw wrappers occasionally—remove obsolete ones.
10. Before final export: skim PDF at 80% zoom to catch spacing & orphan lines.

---

## 15. Troubleshooting
| Issue | Try This |
|-------|----------|
| PDF not updating | Save again; check for unclosed \\\`\\\`\\\` fences; look for stray \\\`<!--raw-typst\\\` not closed. |
| Scroll sync off | Ensure sync toggle active; verify you're not in one-way mode. |
| Image not showing | Path correct? Relative to file? No spaces at end? |
| Math renders wrong | Check for missing \\\`$\\\` or extra backticks. |
| Broken layout | Remove experimental wrappers; rebuild section cleanly. |
| Slow typing lag | Large doc: disable two-way sync or thumbnails temporarily. |

---

## 16. Quick Reference Card
Bold: Ctrl+B · Italic: Ctrl+I · Code: Ctrl+\\\` · Link: Ctrl+K · H1/H2/H3: Ctrl+Alt+1/2/3 · Lists: Ctrl+Shift+8/7/9 · Quote: Ctrl+Shift+Q · Code Block: Ctrl+Shift+C · Find: Ctrl+F · Replace: Ctrl+H · Save: Ctrl+S · Render: Ctrl+R · Undo/Redo: Ctrl+Z / Ctrl+Y · Fullscreen: F11

---

## 17. Typst Wrappers (Short Note)
Those comment blocks are temporary "power inserts." You can still edit inside them. If things look messy, you can remove the outer wrapper and re-insert via the proper button.

---

Need more? External references:
- General Markdown: https://www.markdownguide.org
- Extended Pandoc Markdown: https://pandoc.org/MANUAL.html
- Typst docs: https://typst.app/docs/

Enjoy the flow. Focus on words first; polish later. ✍️
`;
