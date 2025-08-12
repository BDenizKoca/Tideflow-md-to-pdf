
# MD → PDF Studio - Electron + Typst - PDF First - Production Design Doc (Killer)

## 0. TL;DR
- **Authoring:** Markdown
- **Engine:** Typst compiler via `typst.ts` (WASM) inside Electron
- **Preview:** PDF.js shows the actual compiled PDF bytes
- **Export:** Saves the same bytes shown in preview
- **Offline:** 100 percent
- **Image tools:** Upload, preview, resize in mm with handles, left-center-right alignment, live DPI meter
- **Guardrails:** Preflight gate for fonts, DPI, overflow, stability, and version pinning

---

## 1. Product Goals
- Produce **stable, high-quality PDFs** from Markdown with precise pagination
- Keep a **fast feedback loop** - live preview on idle, no layout drift between preview and export
- Give authors **direct control** over pages, headers, footers, images, and tables
- Run **fully offline** and be **packageable** as a desktop app

### Non-Goals
- Full WYSIWYG text editing in the PDF surface (we edit Markdown, not PDF canvas)
- Cloud features, real-time collaboration, or server infrastructure in v1

---

## 2. Core Principles
- **PDF is the single source of truth** - preview and export share identical bytes
- **One engine** - Typst via `typst.ts` for deterministic layout
- **One stylesheet** - global style definitions applied consistently
- **Markdown is canonical** - all UI actions round-trip to Markdown
- **Determinism over tricks** - avoid layout hacks that vary across machines

---

## 3. User Stories
1. Edit Markdown, wait 300-600 ms, see the updated PDF preview
2. Insert an image, set width to 120 mm, center it, see DPI status go green
3. Add a page break, confirm page count change in preview
4. Turn on headers and footers, show Page X of Y and section title
5. Add a TOC - in v1 it is clickable, in v2 it also shows page numbers
6. Export - the resulting PDF matches the preview bit-for-bit

---

## 4. Architecture Overview
### 4.1 Electron
- **Renderer**: React + TypeScript + CodeMirror 6, PDF.js, Image Manager, Preflight
- **Main**: IPC, file dialogs, file IO, safe sandboxing
- **Compiler**: `typst.ts` runs in the renderer or a dedicated worker for responsiveness

### 4.2 Data Flow
```
Markdown edits → Transpiler (MD→Typst) → Typst source
→ typst.ts compile → PDF bytes
→ PDF.js preview → Export uses same bytes
```

### 4.3 Modules
- **Editor**: Markdown + CSS editors, keyboard shortcuts, page-break insertion
- **Transpiler**: Converts Markdown AST plus directives to Typst source
- **Compiler**: Wraps `typst.ts` API with preamble, fonts, and assets
- **Preview**: PDF.js with worker configured and blob lifecycle management
- **Assets**: Image import, hashing, storage, metadata, and figure management
- **Preflight**: Validates fonts, DPI, overflow, stability before enabling export
- **State**: Zustand store for document, UI, jobs, and settings

---

## 5. Data Model
```ts
type BlockKey = 'cover' | 'toc' | 'content' | 'footer';
type Align = 'left' | 'center' | 'right';

interface AssetMeta {
  id: string;            // uuid
  name: string;
  mime: string;
  bytes: number;
  widthPx: number;       // intrinsic
  heightPx: number;
  sha256: string;        // content hash
  createdAt: number;
  path?: string;         // local file path for Electron
}

interface FigureAttrs {
  widthMm?: number;
  align?: Align;
  caption?: string;
  alt?: string;
}

interface ImagePlacement {
  assetId: string;
  attrs: FigureAttrs;
}

interface DocState {
  title: string;
  subtitle?: string;
  footer?: string;
  markdown: string;
  css: string; // optional user style tokens mapped to Typst
  blocks: { key: BlockKey; visible: boolean }[];
  page: { size: 'A4' | 'Letter'; marginMm: number; bleedMm?: number; grayscale?: boolean };
  font: { family: string; basePt: number; language: 'tr' | 'en' | string };
  assets: Record<string, AssetMeta>;
  images: Record<string, ImagePlacement>;
  settings: { debounceMs: number };
  cachedPdf?: ArrayBuffer; // last compiled bytes
  lastStableHash?: string; // for stability checks
}
```

---

## 6. Markdown → Typst Transpiler
The transpiler takes Markdown AST and a small set of custom directives, then emits Typst source.

### 6.1 Supported Markdown
- Headings `#`..`######`
- Paragraphs, emphasis, strong, inline code
- Lists ordered and unordered
- Code fences with language tag
- Links, images
- Blockquote, horizontal rules
- Tables in GitHub style

### 6.2 Custom Directives
- **Page break**:  
  Markdown: `<!-- pagebreak -->` or `:::pagebreak`  
  Typst: `#pagebreak()`
- **Figure**:  
  Markdown:
  ```
  :::figure {id="img-3" width=120mm align=center caption="Çamkale giriş kapısı" alt="City gate at dusk"}
  ![](asset:img-3)
  :::
  ```
  Typst (emitted):
  ```typst
  #align(center)[
    #figure(
      image("asset:img-3", width: 120mm),
      caption: [Çamkale giriş kapısı],
    )
  ]
  ```
  - `align=left|center|right` maps to `#align(left|center|right)[ … ]`
  - Width is always in mm for pagination stability
- **Table** with widths:  
  Markdown:
  ```
  :::table {cols="30% 40% 30%" width=170mm}
  | A | B | C |
  | - | - | - |
  | … | … | … |
  :::
  ```
  Typst: emit a table with explicit column widths and total width set to 170 mm

### 6.3 Preamble Assembly
The transpiler wraps the body with a preamble that sets page, fonts, and common styles. Example shape:
```typst
// Page
#set page(
  paper: "a4",
  margin: 15mm,
)

// Fonts and language
#set text(
  font: "YourBundledFont",
  size: 12pt,
  lang: "tr",
)

// Headings, lists, code styles - defined here
// Header and footer templates - see section 9
```

### 6.4 TOC and Outline
- v1: emit outline entries from headings for a clickable outline
- v2: use Typst referencing to insert page numbers into a TOC block

---

## 7. Compiler Integration - `typst.ts`
- Create a compiler instance in the renderer or a worker
- Feed the generated Typst source string
- Provide a resource resolver that maps `image("asset:img-3")` to a `file://` path or bytes
- Receive PDF bytes as `Uint8Array`
- Convert to `Blob` for preview and cache for export

Pseudo-code:
```ts
import { TypstCompiler } from "@myriad-dreamin/typst.ts";

let compiler: TypstCompiler | null = null;
async function ensureCompiler() {
  compiler ??= await TypstCompiler.create();
  return compiler;
}

export async function compileToPdf(typstSource: string, assets: Record<string, AssetMeta>): Promise<Uint8Array> {
  const c = await ensureCompiler();
  // Optionally implement a resource loader here
  const pdf = await c.compile(typstSource, { format: "pdf" });
  return pdf;
}
```

---

## 8. PDF Preview
- Use PDF.js with a correctly configured worker
- Create and revoke Blob URLs to avoid leaks
- Only display the most recent job by render id
- Ensure toolbar for zoom, page nav, and search

---

## 9. Headers and Footers
Define a simple header and footer in the Typst preamble. Example shape:
```typst
#set page(
  header: [
    // Section title or document title
    // Keep height stable
  ],
  footer: [
    // "Page " + counter(page) + " of " + counter(pages)
  ],
)
```

Notes:
- Keep header and footer height predictable
- Use the same font family as body for stable metrics

---

## 10. Images - Upload, Preview, Resize, Alignment
### 10.1 Import
- Drag-drop or file picker
- Compute SHA-256 and read intrinsic width and height
- Store at `assets/<sha256>.<ext>` and register `assetId`

### 10.2 Manager UI
- Grid of thumbnails with intrinsic size and usage badge
- Detail drawer with path, size, hash, and insert button

### 10.3 Insert Dialog
- Alignment: left - center - right
- Width: slider in mm with numeric input
- Caption and alt text
- Live DPI meter computed as:
  - `dpi = widthPx / (widthMm / 25.4)`

### 10.4 Resize in Preview
- Select a figure to show handles
- Dragging updates `widthMm` in the Markdown directive
- Alignment buttons write `align` attribute
- Re-render after debounce

### 10.5 Export Rules
- Warn if any figure is between 150-219 dpi
- Block export if any figure is below 150 dpi unless user opts to override

---

## 11. Tables
- Convert Markdown tables to Typst tables
- If a directive sets `width` and column percentages, emit widths explicitly
- Prevent horizontal overflow by constraining to page content width

---

## 12. Fonts and Language
- Bundle a metric-stable font family that supports Turkish glyphs
- Set language to `tr` in preamble to enable proper hyphenation
- Preflight: scan content for missing glyphs and warn or block on critical gaps

---

## 13. Preflight Gate
Export is enabled only if:
- Fonts are loaded and glyph coverage is OK
- All images decoded and DPI thresholds pass or are explicitly overridden
- No table or code block overflows the content box
- Page count is stable across two consecutive compiles
- Electron and font versions match the pinned configuration

---

## 14. Performance Targets
- First compile under 2 s for small docs
- 40 pages under 6 s on a mid-range laptop
- Debounce input at 300-600 ms
- Cache by content hash and skip identical compiles
- Keep the compiler instance warm

---

## 15. Security and Privacy
- Renderer is sandboxed - `contextIsolation: true`, `nodeIntegration: false`
- Whitelist IPC handlers
- Sanitize any inline HTML in Markdown before transpiling
- No network access by default

---

## 16. Packaging
- electron-builder
- Include fonts and initial assets under `extraResources`
- Verify font licenses
- Ship a pinned Electron version

---

## 17. Testing and QA
### 17.1 Golden PDFs
- Keep 5 reference documents covering headings, TOC, images, tables, and long text
- CI compiles them and compares byte size and page count
- Flag any unexpected change

### 17.2 Transpiler Unit Tests
- Round-trip tests for `:::figure` edits
- Mapping tests for headings, lists, code, and tables
- Fuzz tests with random Markdown to catch parser edge cases

### 17.3 Manual QA
- Windows and macOS pagination checks
- Turkish hyphenation sanity review

---

## 18. Risks and Mitigations
- **Compiler or font version drift** - pin versions, check hashes in preflight
- **DPI misuse** - live meter and export blocking under 150 dpi
- **Transpiler errors** - unit tests and fallback rendering of raw Markdown section if a block fails
- **Memory use with large images** - prefer `file://` asset resolver in Electron and downsample on insert when needed

---

## 19. Acceptance Criteria
- Preview equals export bit-for-bit
- Text is selectable in PDF
- Images can be uploaded, resized in mm, and aligned left-center-right
- DPI indicator blocks export under 150 dpi unless overridden
- No table overflow in the final PDF
- Headers and footers render stable pagination
- TOC clickable in v1 - numeric in v2

---

## 20. API and IPC Contracts
Renderer → Main:
- `pick-files({ filters })` → `string[]`
- `read-file(path)` → `{ bytes, mime }`
- `save-pdf(bytes, defaultPath)` → `{ ok: true, path }`

Renderer internal:
- `compileToPdf(typstSource, assets)` → `Uint8Array`

---

## 21. File Layout (suggested)
```
/app
  /electron
    main.ts
    preload.ts
  /renderer
    /components
      Editor.tsx
      PdfViewer.tsx
      ImageManager.tsx
    /transpile
      md-to-typst.ts
    /compile
      compiler.ts
      resource-loader.ts
    /state
      store.ts
    /styles
      base.typ   // optional shared Typst snippets
```

---

## 22. Implementation Plan - next 7 days
**Day 1-2** - Scaffold Electron app, integrate PDF.js worker, wire IPC for save dialog  
**Day 3** - Add `typst.ts`, compile a hardcoded `.typ` source, display PDF bytes  
**Day 4** - Implement Markdown editor and a basic MD→Typst transpiler for headings, paragraphs, page breaks  
**Day 5** - Image Manager: import, hash, store, insert figure directive, compile and preview  
**Day 6** - Resize handles and alignment controls that edit the figure directive, DPI meter, preflight gate  
**Day 7** - Headers, footers, and basic TOC outline. Golden PDFs and smoke tests

---

## 23. Open Items for v2
- Numeric TOC using Typst references
- Cropping and rotation for figures
- Footnotes and endnotes
- Per-section page styles and running headers
- Export profile with optional image recompress
