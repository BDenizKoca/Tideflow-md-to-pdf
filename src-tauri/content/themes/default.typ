// Default Theme - Modern and balanced all-purpose design

#let default_theme(prefs, doc) = {
  // Extract preferences with defaults
  let main-font = prefs.fonts.at("main", default: "Linux Libertine")
  let mono-font = prefs.fonts.at("mono", default: "Latin Modern Mono")
  let font-size = prefs.at("font_size", default: 11) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#ffffff"))
  let font-color = rgb(prefs.at("font_color", default: "#000000"))
  let accent = rgb(prefs.at("accent_color", default: "#2d3e50"))
  let heading-scale = prefs.at("heading_scale", default: 1.0)
  
  set page(paper: prefs.papersize, fill: page-bg, margin: (x: 2.5cm, y: 3cm))
  set text(font: main-font, size: font-size, lang: "en", fill: font-color, fallback: true)
  set par(leading: 0.75em, spacing: 1em, justify: false)
  show raw: set text(font: mono-font, size: font-size * 0.9, fallback: true)
  
  // Code blocks with subtle background
  show raw.where(block: true): block.with(
    fill: rgb(248, 249, 250),
    inset: 10pt,
    radius: 4pt,
    width: 100%
  )

  // Headings with clean hierarchy
  show heading.where(level: 1): it => {
    set text(
      font: main-font,
      weight: 700,
      size: 24pt * heading-scale,
      fill: accent,
    )
    block(above: 24pt, below: 16pt)[#it]
  }
  
  show heading.where(level: 2): it => {
    set text(
      font: main-font,
      weight: 600,
      size: 17pt * heading-scale,
      fill: accent,
    )
    block(above: 18pt, below: 12pt)[#it]
  }
  
  show heading.where(level: 3): it => {
    set text(
      font: main-font,
      weight: 600,
      size: 14pt * heading-scale,
      fill: accent,
    )
    block(above: 14pt, below: 10pt)[#it]
  }

  // Horizontal rule as elegant separator
  show line: it => block(
    width: 100%,
    height: 2pt,
    above: 12pt,
    below: 12pt,
    fill: gradient.linear(
      accent.transparentize(100%),
      accent,
      accent.transparentize(100%)
    )
  )

  // Blockquotes with subtle background and left border
  show quote: it => block(
    fill: luma(248),
    stroke: (left: 3pt + accent.lighten(40%)),
    inset: (left: 18pt, rest: 12pt),
    radius: 3pt,
    width: 100%,
  )[
    #set text(style: "italic", fill: font-color.lighten(15%))
    #it
  ]

  // Lists with proper spacing
  set list(indent: 12pt, body-indent: 8pt, marker: ([•], [◦], [‣]))
  set enum(indent: 12pt, body-indent: 8pt)

  // Links styled with accent color
  show link: it => underline(text(fill: accent)[#it])

  // Emphasis and strong text
  show emph: it => text(style: "italic", fill: accent)[#it]
  show strong: it => text(weight: 700, fill: font-color)[#it]

  doc
}
