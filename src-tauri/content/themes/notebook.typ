// Notebook Theme
// Aged parchment paper aesthetic with ornamental handwritten style

#let notebook_theme(prefs, doc) = {
  let main-font = prefs.fonts.at("main", default: "Comic Sans MS")
  let mono-font = prefs.fonts.at("mono", default: "Courier New")
  let font-size = prefs.at("font_size", default: 11) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#f4e8d0"))
  let font-color = rgb(prefs.at("font_color", default: "#1a1a1a"))
  let accent = rgb(prefs.at("accent_color", default: "#2a2a2a"))
  let heading-scale = prefs.at("heading_scale", default: 1.05)
  
  // Typography - Informal
  set text(
    font: main-font,
    size: font-size,
    lang: "en",
    fill: font-color,
    fallback: true,
  )
  
  set par(
    justify: false,
    leading: 0.9em,
    spacing: 1.3em,
  )
  
  set page(
    paper: prefs.papersize,
    margin: (
      left: 3.5cm,
      right: 3cm,
      top: 3cm,
      bottom: 3cm,
    ),
    fill: page-bg,
    background: place(top + left, rect(
      width: 100%,
      height: 100%,
      stroke: (thickness: 8pt, paint: rgb("#b8926a"), dash: "densely-dotted"),
      inset: 0.8cm,
    )),
  )

  // Headings - First level - Ornamental parchment header
  show heading.where(level: 1): it => {
    set text(font: main-font, weight: 800, size: 28pt * heading-scale, fill: font-color)
    set align(center)
    block(above: 22pt, below: 16pt)[
      #it.body
      #v(8pt)
      #box(width: 60%)[
        #line(length: 100%, stroke: (paint: accent, thickness: 1.5pt))
      ]
    ]
  }

  // Second level - Ornamental bracket
  show heading.where(level: 2): it => {
    set text(font: main-font, weight: 700, size: 19pt * heading-scale, fill: font-color)
    block(above: 18pt, below: 11pt)[
      #text(size: 16pt, fill: accent)[❧] #h(8pt) #it.body
    ]
  }

  // Third level - Aged ink with flourish
  show heading.where(level: 3): it => {
    set text(font: main-font, weight: 700, size: 15pt, fill: font-color)
    block(above: 14pt, below: 9pt)[
      #text(size: 12pt, fill: accent)[✦] #h(5pt) #it.body
    ]
  }

  // Separator - Ornamental flourish
  show line: it => {
    set align(center)
    block(above: 14pt, below: 14pt)[
      #text(size: 14pt, fill: accent)[❦ ✦ ❦]
    ]
  }

  // Blockquotes with aged paper background
  show quote: it => block(
    fill: rgb("#ebe3d0"),
    stroke: (
      left: (
        paint: rgb("#a0826d"),
        thickness: 3pt,
        dash: "dotted"
      )
    ),
    inset: (left: 22pt, rest: 14pt),
    radius: 0pt,
    width: 100%,
  )[
    #set text(size: 10.5pt, fill: rgb("#1a1a1a"), style: "italic")
    #it
  ]

  // Code blocks - Aged manuscript box
  show raw.where(block: true): it => block(
    width: 100%,
    fill: rgb("#ebe3d0"),
    stroke: (thickness: 1.5pt, paint: rgb("#a0826d"), dash: "dotted"),
    inset: 12pt,
    radius: 0pt,
  )[
    #set text(font: "Courier New", size: 9.5pt, fill: rgb("#1a1a1a"))
    #it
  ]

  // Inline code - Aged parchment highlight
  show raw.where(block: false): it => box(
    fill: rgb("#ddd2b8"),
    inset: (x: 5pt, y: 0pt),
    outset: (y: 3pt),
    radius: 0pt,
    stroke: (thickness: 0.5pt, paint: rgb("#a0826d")),
  )[
    #set text(font: "Courier New", size: 10pt, fill: rgb("#1a1a1a"))
    #it
  ]

  // Lists - Dashes
  set list(marker: ([-], [-], [-]), indent: 14pt)
  set enum(indent: 14pt)

  // Links - Vintage ink underline
  show link: it => {
    set text(fill: rgb("#1a1a1a"))
    underline(offset: 2pt, stroke: 1pt + rgb("#3a3a3a"), it)
  }

  // Emphasis - Aged ink
  show emph: set text(style: "italic", fill: rgb("#2a2a2a"))
  show strong: set text(weight: 700, fill: rgb("#1a1a1a"))
  
  doc
}
