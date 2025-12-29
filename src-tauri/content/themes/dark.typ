// Dark Theme
// White text on dark background for reduced eye strain

#let dark_theme(prefs, doc) = {
  let main-font = prefs.fonts.at("main", default: "Verdana")
  let mono-font = prefs.fonts.at("mono", default: "Courier New")
  let font-size = prefs.at("font_size", default: 11) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#282828"))
  let font-color = rgb(prefs.at("font_color", default: "#ffffff"))
  let accent = rgb(prefs.at("accent_color", default: "#ffffff"))
  let heading-scale = prefs.at("heading_scale", default: 1.1)
  
  // Typography - Light text on dark
  set text(
    font: main-font,
    size: font-size,
    lang: "en",
    fill: font-color,
    fallback: true,
  )
  
  set par(
    justify: true,
    leading: 0.8em,
    spacing: 1.1em,
  )
  
  set page(
    paper: prefs.papersize,
    margin: (
      left: 2.5cm,
      right: 2.5cm,
      top: 3cm,
      bottom: 3cm,
    ),
    fill: page-bg,
  )
  
  // Headings - First level - Light with accent
  show heading.where(level: 1): it => {
    set text(font: main-font, weight: 700, size: 28pt * heading-scale, fill: accent)
    block(above: 20pt, below: 14pt)[
      #it.body
      #v(6pt)
      #box(width: 100%, height: 2pt, fill: accent.lighten(20%))
    ]
  }
  
  // Second level - Accent color
  show heading.where(level: 2): it => {
    set text(font: main-font, weight: 600, size: 19pt * heading-scale, fill: accent)
    block(above: 16pt, below: 11pt)[
      #it.body
    ]
  }
  
  // Third level - Font color
  show heading.where(level: 3): it => {
    set text(font: main-font, weight: 600, size: 15pt * heading-scale, fill: font-color)
    block(above: 14pt, below: 9pt)[
      #it.body
    ]
  }
  
  // Separator - Accent line
  show line: it => block(
    width: 100%,
    height: 2pt,
    above: 12pt,
    below: 12pt,
    fill: accent.transparentize(30%)
  )
  
  // Blockquotes with darker background panel
  show quote: it => block(
    fill: rgb(35, 35, 35),
    stroke: (left: 3pt + accent.transparentize(50%)),
    inset: (left: 20pt, rest: 14pt),
    radius: 4pt,
    width: 100%,
  )[
    #set text(size: 11pt, style: "italic", fill: rgb(180, 180, 185))
    #it
  ]
  
  // Code blocks - Darker background
  show raw.where(block: true): it => block(
    width: 100%,
    fill: rgb(30, 30, 30),
    stroke: 1pt + rgb(100, 100, 100),
    inset: 12pt,
    radius: 4pt,
  )[
    #set text(font: ("Courier New"), size: 9.5pt, fill: rgb(200, 200, 200))
    #it
  ]
  
  // Inline code - Highlighted
  show raw.where(block: false): it => box(
    fill: rgb(60, 60, 60),
    inset: (x: 4pt, y: 0pt),
    outset: (y: 3pt),
    radius: 2pt,
  )[
    #set text(font: ("Courier New"), size: 10pt, fill: rgb(220, 220, 220))
    #it
  ]
  
  // Lists
  set list(marker: ([•], [◦], [‣]), indent: 12pt)
  set enum(indent: 12pt)
  
  // Links - Light gray
  show link: it => {
    set text(fill: rgb(200, 200, 200))
    underline(offset: 2pt, it)
  }
  
  // Emphasis
  show emph: set text(style: "italic", fill: rgb(180, 180, 180))
  show strong: set text(weight: 700, fill: rgb(255, 255, 255))
  
  doc
}
