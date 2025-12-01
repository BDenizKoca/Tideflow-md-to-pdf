// Main Tideflow Typst template (lean, preference-driven)
#import "@preview/cmarker:0.1.6": render
#import "themes/registry.typ": get-theme

#let prefs = json("prefs.json")
#let theme-id = if "theme_id" in prefs { prefs.theme_id } else { "default" }

// Apply theme to entire document using show rule
#show: get-theme(theme-id).with(prefs)

#let accent-color = rgb(45, 62, 80) // Default accent

// Capture built-in image to avoid recursive overrides
#let builtin-image = image

// Provide a lightweight `anchor` function for the render scope. We inject
// literal `#label("id")[box(...)]` snippets from the Rust preprocessor, so
// the anchor helper does not need to produce any output; it just needs to
// exist in the scope when `render` is called.
#let anchor = id => none

#let admonition-colors = (
  "note": (fill: color.mix(accent-color, rgb(255, 255, 255)), stroke: accent-color),
  "info": (fill: rgb(224, 242, 254), stroke: rgb(186, 230, 253)),
  "tip": (fill: rgb(220, 252, 231), stroke: rgb(187, 247, 208)),
  "warning": (fill: rgb(254, 249, 195), stroke: rgb(253, 224, 71)),
  "important": (fill: rgb(254, 243, 199), stroke: rgb(251, 191, 36))
)

#let admonition-titles = (
  "note": "Note",
  "info": "Info",
  "tip": "Tip",
  "warning": "Warning",
  "important": "Important"
)

#let admonition(kind: str, body) = {
  let key = kind.lower()
  let palette = admonition-colors.at(key, default: admonition-colors.at("note"))
  let title = admonition-titles.at(key, default: kind.upper())
  block(
    fill: palette.fill,
    stroke: 0.5pt + palette.stroke,
    inset: 10pt,
    radius: 8pt,
    spacing: 12pt,
  )[
    text(weight: 600)[#title]
    v(4pt)
    body
  ]
}

#let sanitize-str = it => if type(it) == str { it.trim() } else { "" }

#let cover_enabled = {
  if "cover_page" in prefs {
    if type(prefs.cover_page) == bool { prefs.cover_page } else { false }
  } else { false }
}

#let cover_title = sanitize-str(if "cover_title" in prefs { prefs.cover_title } else { "" })
#let cover_writer = sanitize-str(if "cover_writer" in prefs { prefs.cover_writer } else { "" })
#let cover_image = sanitize-str(if "cover_image" in prefs { prefs.cover_image } else { "" })
#let cover_image_width = if "cover_image_width" in prefs { prefs.cover_image_width } else { "60%" }

#let render_cover_page = {
  // Only render the cover when enabled in preferences. Use a code-level `if` so
  // `#` directives are not placed at the top-level of a code block.
  if cover_enabled {
    let has_title = cover_title != ""
    let has_writer = cover_writer != ""
    let has_image = cover_image != ""

    align(center, box(width: 100%)[
      #v(5cm)
      #if has_image [
        #align(center, builtin-image(cover_image, width: eval(cover_image_width)))
        #v(24pt)
      ]
      #if has_title [
        #text(size: 28pt, weight: 700)[#cover_title]
        #v(12pt)
      ]
      #if has_writer [
        #text(size: 16pt, fill: color.mix(accent-color, rgb(0, 0, 0)))[#cover_writer]
        #v(12pt)
      ]
  ])
  } else { none }
}

// Safe margin parsing (supports cm/mm/in/pt or numeric fallback)
#let parse-length = it => if type(it) == str {
  if it.ends-with("%") { float(it.slice(0, -1)) * 1% }
  else if it.ends-with("px") { float(it.slice(0, -2)) * 0.75pt } // approx CSS px→pt at 96dpi
  else if it.ends-with("cm") { float(it.slice(0, -2)) * 1cm }
  else if it.ends-with("mm") { float(it.slice(0, -2)) * 1mm }
  else if it.ends-with("in") { float(it.slice(0, -2)) * 1in }
  else if it.ends-with("pt") { float(it.slice(0, -2)) * 1pt }
  else {  // bare number interpret as cm for convenience
    float(it) * 1cm
  }
} else { it };

#let margin_x = parse-length(prefs.margin.x)
#let margin_y = parse-length(prefs.margin.y)

// Basic page setup without numbering/header (will be set conditionally later)
// Don't set columns here - let the theme handle it initially
#set page(
  paper: prefs.papersize, 
  margin: (x: margin_x, y: margin_y)
)

// Apply line height
#let line_height_val = if "line_height" in prefs { prefs.line_height } else { 1.5 }
#set par(leading: (line_height_val - 1.0) * 1em)

// Apply paragraph spacing
#let para_spacing = if "paragraph_spacing" in prefs { 
  eval(prefs.paragraph_spacing)
} else { 
  0.65em 
}
#set block(spacing: para_spacing)

// Store section numbering preference for later
#let number_sections = if "numberSections" in prefs { prefs.numberSections } else { true }

// CRITICAL: Disable any automatic outline generation by Typst or cmarker
#set outline(title: none)

// Read markdown content
#let md_content = read("content.md")

// Determine if we need two-column layout for main content
#let two_column_layout = if "two_column_layout" in prefs { prefs.two_column_layout } else { false }
#let toc_two_column = if "toc_two_column" in prefs { prefs.toc_two_column } else { false }
#let show_page_numbers = if "page_numbers" in prefs { prefs.page_numbers } else { false }
#let show_header = if "header_title" in prefs { prefs.header_title } else { false }
#let header_text = if "header_text" in prefs { prefs.header_text } else { "" }

// Render cover in single-column mode
#if cover_enabled [
  #set page(columns: 1, numbering: none)
  #render_cover_page
  #pagebreak()
]

// Render TOC with optional two-column layout
#if prefs.toc [
  #set page(columns: if toc_two_column { 2 } else { 1 }, numbering: none)
  
  #let has_custom_title = "toc_title" in prefs and prefs.toc_title.trim() != ""
  #if has_custom_title [
    #text(size: 16pt, weight: 600)[#prefs.toc_title]
    #v(6pt)
  ]
  
  // Generate outline explicitly here without numbering
  #set heading(numbering: none)
  #outline(title: none, depth: 3)
  #pagebreak()
]

// Set up page format for main content with proper column layout
#set page(
  numbering: if show_page_numbers { "1" } else { none },
  header: if show_header and header_text != "" {
    align(right, text(size: 9pt, fill: gray)[_#header_text _])
  } else { none },
  columns: if two_column_layout { 2 } else { 1 }
)

// Reset page counter to start at 1 for main content
#if show_page_numbers [
  #counter(page).update(1)
]

// Apply section numbering for main content only
#set heading(numbering: if number_sections { "1.1" } else { none })

// Render markdown content with explicit outline suppression
#show outline: none

// Define fallback helpers at top-level so we don't need to pass them as
// keyword arguments into #render (some cmarker versions reject unexpected
// keyword arguments). These are safe defaults; the Rust preprocessor may
// still inject label/anchor markup directly into the markdown.
#let anchor = (id => none)
#let image = (path, alt: none, ..n) => builtin-image(path, alt: alt, ..n)

// Safe link function that doesn't fail on missing labels
// cmarker passes: label type for internal links, str for external URLs
#let safe-link(target, body) = context {
  // If cmarker passes a label directly (internal links like [text](#anchor))
  if type(target) == label {
    let results = query(target)
    if results.len() > 0 {
      link(target, body)
    } else {
      // Label doesn't exist - just show the text (no broken link)
      body
    }
  } else if type(target) == str {
    // String target - check if external URL or internal anchor
    if target.starts-with("http://") or target.starts-with("https://") or target.starts-with("mailto:") or target.starts-with("tel:") {
      // External link - pass through to native link
      link(target, body)
    } else if target.starts-with("#") {
      // Internal anchor with # prefix - strip and convert to label
      let label-name = target.slice(1)
      let target-label = label(label-name)
      let results = query(target-label)
      if results.len() > 0 {
        link(target-label, body)
      } else {
        body
      }
    } else {
      // Other string - try as label name directly
      let target-label = label(target)
      let results = query(target-label)
      if results.len() > 0 {
        link(target-label, body)
      } else {
        // Fallback: try as regular link
        link(target, body)
      }
    }
  } else {
    // Unknown type - try native link
    link(target, body)
  }
}

#render(md_content,
  smart-punctuation: false,
  raw-typst: true,
  // Enable math rendering - Typst math syntax is close enough to LaTeX
  math: (block: false, body) => {
    // Just wrap in $ delimiters and let Typst parse it
    // Most common LaTeX math works in Typst with minor differences
    if block {
      // Block math - display style, centered
      [$ #body $]
    } else {
      // Inline math
      [$#body$]
    }
  },
  scope: (
    link: safe-link,
  ),
  // Note: cmarker 0.1.6 follows standard Markdown line break rules:
  // - Single newline = soft break (ignored in output)
  // - Two spaces + newline = hard break (<br>)
  // - Blank line = paragraph break
  html: (
    // Handle <img src width data-align> so we can control size and alignment
    img: ("void", attrs => {
      // Use safe dictionary access for HTML attributes
      let path = attrs.at("src")
      // Read width safely; consider empty string as none
      let wraw = attrs.at("width", default: none)
      let w = if type(wraw) == str and wraw.trim() != "" { wraw } else { none }
      // Load the image directly
      let im = if w != none { 
        builtin-image(path, width: parse-length(w))
      } else { 
        builtin-image(path)
      }
      // Alignment: data-align takes precedence, then align, default to center
      let a = attrs.at("data-align", default: attrs.at("align", default: "center"))
      if a == "center" { align(center, im) }
      else if a == "right" { align(right, im) }
      else { im }
    })
  )
)
