// Modern Theme
// Clean, contemporary design with subtle accents

#let modern_theme(prefs, doc) = {
  let main-font = prefs.fonts.at("main", default: "Arial")
  let mono-font = prefs.fonts.at("mono", default: "Courier New")
  let font-size = prefs.at("font_size", default: 11) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#f8fafc"))
  let font-color = rgb(prefs.at("font_color", default: "#0f172a"))
  let accent = rgb(prefs.at("accent_color", default: "#323232"))
  let heading-scale = prefs.at("heading_scale", default: 1.1)
  
  // Typography
  set text(
    font: main-font,
    size: font-size,
    lang: "en",
    fill: font-color,
    fallback: true,
  )
  
  set par(
    justify: true,
    leading: 0.75em,
    spacing: 1.1em,
  )
  
  set page(
    paper: prefs.papersize,
    fill: page-bg,
    margin: (
      left: 3cm,
      right: 3cm,
      top: 3cm,
      bottom: 3cm,
    ),
  )
  
  // Headings - First level
  show heading.where(level: 1): it => {
    set text(font: main-font, weight: 300, size: 32pt * heading-scale, fill: accent)
    block(above: 20pt, below: 12pt)[
      #it.body
      #v(6pt)
      #line(length: 100%, stroke: 2pt + accent.lighten(40%))
    ]
  }
  
  // Second level
  show heading.where(level: 2): it => {
    set text(font: main-font, weight: 500, size: 18pt * heading-scale, fill: accent)
    block(above: 14pt, below: 9pt)[
      #box(width: 4pt, height: 18pt, fill: accent)
      #h(8pt)
      #it.body
    ]
  }
  
  // Third level
  show heading.where(level: 3): it => {
    set text(font: main-font, weight: 500, size: 13pt * heading-scale, fill: font-color)
    block(above: 12pt, below: 8pt)[
      #it.body
    ]
  }
  
  // Separator
  show line: it => block(
    width: 100%,
    height: 1pt,
    above: 14pt,
    below: 14pt,
    fill: rgb(220, 220, 220)
  )
  
  // Blockquotes with sleek background
  show quote: it => block(
    fill: rgb(248, 250, 252),
    stroke: (left: 3pt + accent.lighten(50%)),
    inset: (left: 18pt, rest: 14pt),
    radius: 4pt,
    width: 100%,
  )[
    #set text(size: 10pt, fill: rgb(80, 80, 80), style: "italic")
    #it
  ]
  
  // Code blocks
  show raw.where(block: true): it => block(
    width: 100%,
    fill: rgb(250, 250, 250),
    stroke: 1pt + rgb(230, 230, 230),
    inset: 12pt,
    radius: 4pt,
  )[
    #set text(font: "Courier New", size: 9pt)
    #it
  ]
  
  // Inline code
  show raw.where(block: false): it => box(
    fill: rgb(245, 247, 250),
    inset: (x: 4pt, y: 0pt),
    outset: (y: 3pt),
    radius: 2pt,
  )[
    #set text(font: "Courier New", size: 9.5pt, fill: rgb(100, 100, 100))
    #it
  ]
  
  // Lists
  set list(marker: ([—], [•], [◦]), indent: 12pt)
  set enum(indent: 12pt)
  
  // Links
  show link: it => {
    set text(fill: rgb(100, 150, 200))
    underline(offset: 2pt, stroke: 0.5pt, it)
  }
  
  // Emphasis
  show emph: set text(style: "italic")
  show strong: set text(weight: 600)
  
  doc
}
