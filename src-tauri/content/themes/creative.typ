// Creative Theme
// Artistic layout with dynamic spacing and vibrant colors

#let creative_theme(prefs, doc) = {
  let main-font = prefs.fonts.at("main", default: "Impact")
  let mono-font = prefs.fonts.at("mono", default: "Courier New")
  let font-size = prefs.at("font_size", default: 11) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#fef3c7"))
  let font-color = rgb(prefs.at("font_color", default: "#1f2937"))
  let accent = rgb(prefs.at("accent_color", default: "#df0808"))
  let heading-scale = prefs.at("heading_scale", default: 1.25)
  
  // Typography - playful mix
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
    spacing: 1.2em,
  )
  
  set page(
    paper: prefs.papersize,
    fill: page-bg,
    margin: (
      left: 2.5cm,
      right: 2.5cm,
      top: 3cm,
      bottom: 3cm,
    ),
  )
  
  // Headings - First level (vibrant accent)
  show heading.where(level: 1): it => {
    set text(font: main-font, weight: 900, size: 36pt * heading-scale, fill: accent)
    set align(left)
    block(above: 24pt, below: 16pt)[
      #it.body
      #v(4pt)
      #box(width: 120pt, height: 6pt, fill: gradient.linear(
        accent,
        accent.darken(20%),
      ))
    ]
  }
  
  // Second level - Dark accent
  show heading.where(level: 2): it => {
    set text(font: main-font, weight: 700, size: 20pt * heading-scale, fill: accent.darken(10%))
    block(above: 16pt, below: 10pt)[
      #box(baseline: 30%)[#text(size: 20pt, fill: accent)[▸]] #h(8pt) #it.body
    ]
  }
  
  // Third level - Subtle accent
  show heading.where(level: 3): it => {
    set text(font: main-font, weight: 600, size: 14pt, fill: rgb(99, 92, 92))
    block(above: 12pt, below: 8pt)[
      #text(fill: rgb(99, 92, 92))[◆] #h(6pt) #it.body
    ]
  }
  
  // Separator - Red to gold gradient
  show line: it => {
    set align(center)
    block(above: 16pt, below: 16pt)[
      #box(width: 50%, height: 3pt, fill: gradient.linear(
        rgb(223, 8, 8),
        rgb(221, 171, 53),
        rgb(182, 16, 16),
      ))
    ]
  }
  
  // Blockquotes with warm colored background
  show quote: it => block(
    fill: rgb(255, 250, 240),
    stroke: (left: 4pt + rgb(221, 171, 53)),
    inset: (left: 22pt, rest: 14pt),
    radius: 6pt,
    width: 100%,
  )[
    #set text(size: 11pt, style: "italic", fill: rgb(99, 92, 92))
    #it
  ]
  
  // Code blocks - Dark theme
  show raw.where(block: true): it => block(
    width: 100%,
    fill: rgb(40, 44, 52),
    inset: 12pt,
    radius: 6pt,
  )[
    #set text(font: "Courier New", size: 9.5pt, fill: rgb(230, 230, 230))
    #it
  ]
  
  // Inline code - Accent background
  show raw.where(block: false): it => box(
    fill: rgb(255, 240, 245),
    inset: (x: 4pt, y: 0pt),
    outset: (y: 3pt),
    radius: 2pt,
  )[
    #set text(font: "Courier New", size: 10pt, fill: rgb(200, 60, 100))
    #it
  ]
  
  // Lists - Creative markers
  set list(marker: ([●], [▸], [◆]), indent: 14pt)
  set enum(indent: 14pt)
  
  // Links - Red accent
  show link: it => {
    set text(fill: rgb(182, 16, 16), weight: 600)
    it
  }
  
  // Emphasis
  show emph: set text(style: "italic", fill: rgb(99, 92, 92))
  show strong: set text(weight: 800, fill: rgb(223, 8, 8))
  
  doc
}
