// Academic Two-Column Theme
// Professional two-column layout for papers and articles

#let academic_theme(prefs, doc) = {
  let main-font = prefs.fonts.at("main", default: "Times New Roman")
  let mono-font = prefs.fonts.at("mono", default: "Courier New")
  let font-size = prefs.at("font_size", default: 10) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#ffffff"))
  let font-color = rgb(prefs.at("font_color", default: "#000000"))
  let accent = rgb(prefs.at("accent_color", default: "#000000"))
  let heading-scale = prefs.at("heading_scale", default: 1.0)
  
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
    leading: 0.65em,
    spacing: 0.8em,
  )
  
  // Two-column layout
  set page(
    paper: prefs.papersize,
    margin: (x: 1.8cm, y: 2.2cm),
    fill: page-bg,
    columns: 2,
  )
  
  // Headings - First level (section)
  show heading.where(level: 1): it => {
    set text(font: main-font, weight: 700, size: 12pt * heading-scale, fill: accent)
    set align(center)
    block(above: 16pt, below: 10pt)[
      #it.body
    ]
  }
  
  // Second level (subsection)
  show heading.where(level: 2): it => {
    set text(font: main-font, weight: 600, size: 10.5pt * heading-scale, style: "italic", fill: accent)
    block(above: 12pt, below: 8pt)[
      #it.body.
    ]
  }
  
  // Third level (subsubsection) - run-in
  show heading.where(level: 3): it => {
    set text(font: main-font, weight: 600, size: 10pt * heading-scale, style: "italic", fill: font-color)
    [#it.body. ]
  }
  
  // Separator (horizontal rule)
  show line: it => {
    set align(center)
    block(above: 10pt, below: 10pt)[
      #box(width: 30%, height: 0.5pt, fill: rgb(100, 100, 100))
    ]
  }
  
  // Academic blockquotes with subtle gray background
  show quote: it => block(
    fill: rgb(250, 250, 250),
    stroke: (left: 2pt + rgb(150, 150, 150)),
    inset: (left: 16pt, rest: 10pt),
    radius: 1pt,
    width: 100%,
  )[
    #set text(style: "italic", size: 9.5pt, fill: rgb(70, 70, 70))
    #it
  ]
  
  // Code blocks
  show raw.where(block: true): it => block(
    width: 100%,
    fill: rgb(248, 248, 248),
    stroke: 0.5pt + rgb(220, 220, 220),
    inset: 8pt,
    radius: 2pt,
  )[
    #set text(font: "DejaVu Sans Mono", size: 8.5pt)
    #it
  ]
  
  // Inline code
  show raw.where(block: false): it => box(
    fill: rgb(245, 245, 245),
    inset: (x: 3pt, y: 0pt),
    outset: (y: 3pt),
    radius: 1pt,
  )[
    #set text(font: "DejaVu Sans Mono", size: 9pt)
    #it
  ]
  
  // Lists
  set list(marker: ([•], [◦], [‣]), indent: 10pt)
  set enum(indent: 10pt)
  
  // Links
  show link: it => {
    set text(fill: rgb(0, 80, 140))
    underline(it)
  }
  
  // Emphasis
  show emph: set text(style: "italic")
  show strong: set text(weight: 700)
  
  doc
}
