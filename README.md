<div align="center">

# Tideflow
<img width="1920" height="1032" alt="tideflowv1" src="https://github.com/user-attachments/assets/d4d88097-a895-458b-8e75-770398452e0b" />

**Fast, offline-first Markdown → PDF desktop app powered by Typst**
Write on the left, get a beautifully typeset PDF on the right – instantly.

[![CI](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/ci.yml)
[![Release](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/release.yml/badge.svg)](https://github.com/BDenizKoca/Tideflow-md-to-pdf/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Why I Built It
I wanted a dead-simple, elegant writing tool that outputs print‑ready PDFs **without relying on a web service**, LaTeX toolchains, or heavy exports. That's that TideFlow is, a simple use editor for quickly editing and formatting markdowns as pdfs.

## Features
* Real‑time two-way scroll sync between editor & PDF preview (Has around %70 accuracy)
* Clean, distraction‑lite editor (CodeMirror 6)
* Automatic Table of Contents, optional section numbering, and configurable cover page
* Image paste, drag‑drop, and import dialogs
* **12 beautiful themes**: Default, Minimal, Compact, Elegant, Technical, Magazine, Academic, Creative, Modern, Serif, Notebook, Dark
* Full blockquote support with theme-appropriate backgrounds
* Offline: once installed, **no network required**
* Cross‑platform (Windows / macOS / Linux)
* Fast startup: no giant runtime or Electron bloat


https://github.com/user-attachments/assets/fea9562b-a315-44c1-abc9-1778ab4cd428




## Tech Stack
**Core**
* React 19 + TypeScript + Vite
* Tauri (Rust) shell & command layer
* Typst (bundled binary) for PDF

**Editor**
* CodeMirror 6 + custom Markdown commands (bold, headings, lists, etc.)

**State & Logic**
* Zustand store (single slice: editor state, preferences, UI flags)

**UI & Layout**
* react-resizable-panels (simplified fixed 50/50 split with optional preview toggle)

**Rendering Flow**
1. User edits Markdown → content in Zustand
2. Debounced timer triggers `renderTypst(content)` (Tauri invoke)
3. Rust backend writes temp markdown + preferences JSON
4. Typst binary compiles → PDF path returned
5. Store `compileStatus.pdf_path` updates → `PDFPreview` component reloads iframe (pdf.js optional later)

## Installation

### Download Pre-built Binaries (Recommended)

**Windows:**
- Download `Tideflow_X.X.X_x64-setup.exe` from [Releases](https://github.com/BDenizKoca/Tideflow-md-to-pdf/releases)
- Run the installer

**Linux:**
- **Debian/Ubuntu**: `sudo dpkg -i tideflow_X.X.X_amd64.deb`
- **Fedora/RHEL**: `sudo rpm -i tideflow-X.X.X-1.x86_64.rpm`
- **Universal (Any distro)**: Download and run `tideflow_X.X.X_amd64.AppImage`

**macOS:**
- Download `Tideflow_aarch64.dmg` (Apple Silicon) or `Tideflow_x64.dmg` (Intel)
- Open DMG and drag to Applications

### Build from Source
#### Prerequisites
* Node.js 18+
* Rust (stable)
* Tauri CLI (`cargo install tauri-cli`)

#### Clone & Run
```bash
git clone https://github.com/BDenizKoca/Tideflow-md-to-pdf.git
cd Tideflow-md-to-pdf
npm install
npm run tauri:dev
```

### Build (Release Bundle)
```bash
npm run tauri:build
```

## Usage
1. New / Open a file (or start with the sample)
2. Write Markdown (math, code, images all supported)
3. Watch instant PDF updates (debounce respects your preferences)
4. Export or copy the generated PDF (use **Save PDF As** to pick a destination)

## Supported Markdown / Extras
* Headings (H1-H6), emphasis (bold, italic, strikethrough)
* Code (inline and fenced blocks with syntax highlighting via Typst)
* Math (inline `$...$` and block `$$...$$` via LaTeX-style syntax)
* Lists (ordered, unordered, task lists with `- [ ]` / `- [x]`)
* Blockquotes (single and multi-line with `>`)
* Tables (with alignment support)
* Images (paste, drag-drop, import with metadata)
* Horizontal rules (`---` or `***`)
* Page breaks (via `#pagebreak()` or `<!--raw-typst #pagebreak() -->`)
* Links (inline and reference-style)
* HTML comments for Typst directives

## Preferences / Configuration
Open the **Design** modal from the toolbar to adjust layout, typography, and document chrome without leaving the editor.

* **Themes** – Pick from the bundled Typst themes or continue with your saved custom tweaks.
* **Layout** – Configure paper size, margins, TOC, numbering, and new cover-page metadata (title, author, hero image).
* **Images** – Set default width/alignment plus alt-text defaults for imports.
* **Debounce & rendering** – Fine-tune compile cadence or temporarily pause auto renders.

Changes apply instantly and persist.

**Future:**
As it stands, the current iteration is serving my needs, so I consider this project done but open for future improvements.

## Contributing
PRs welcome. Please:
1. Fork
2. Branch: `feat/thing`
3. Open PR with clear summary + screenshots if UI

## Troubleshooting
| Issue | Fix |
| ----- | --- |
| Blank PDF preview | Ensure Typst binary present in `src-tauri/bin/typst/<platform>` |
| No re-render on edit | Force render with Ctrl+R, or check debounce settings in preferences |
| Blockquotes not rendering | Ensure you're using standard `>` syntax at the start of lines |
| Images not showing | Check that image paths are relative to the document or use absolute paths |
| Theme not applying | Switch themes via the toolbar dropdown, changes apply instantly |
| App won't start | Check that all dependencies are installed: `npm install` then `npm run tauri:dev` |

## Third-Party Notices
Tideflow bundles the official Typst CLI (currently v0.13.1) for macOS, Windows, and Linux so the app works offline out of the box. Typst is available under the MIT OR Apache-2.0 licenses; see the [Typst project](https://github.com/typst/typst) for details. Our release pipeline downloads the upstream archives, verifies their SHA256 digests, and repackages the binaries into the platform bundles.

## License
MIT – use, modify, distribute with attribution.

## Connect
Email: **b.denizkoca@gmail.com**
GitHub: [@BDenizKoca](https://github.com/BDenizKoca)

---
If you create anything cool with Tideflow PLEASE let me know!
