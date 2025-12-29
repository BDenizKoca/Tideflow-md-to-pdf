// Serif Theme
// Classic serif typography for traditional documents

#let serif_theme(prefs, doc) = {
  let main-font = prefs.fonts.at("main", default: "Times New Roman")
  let mono-font = prefs.fonts.at("mono", default: "Courier New")
  let font-size = prefs.at("font_size", default: 12) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#fffef5"))
  let font-color = rgb(prefs.at("font_color", default: "#1c1917"))
  let accent = rgb(prefs.at("accent_color", default: "#282828"))
  let heading-scale = prefs.at("heading_scale", default: 1.15)
  
  // Typography - Traditional serif
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
    spacing: 1.2em,
    first-line-indent: 1.5em,
  )
  
  set page(
    paper: prefs.papersize,
    fill: page-bg,
    margin: (
      left: 3.5cm,
      right: 3.5cm,
      top: 3.5cm,
      bottom: 3.5cm,
    ),
    numbering: "1",
    number-align: center,
  )
  
  // Headings - First level
  show heading.where(level: 1): it => {
    set text(font: main-font, weight: 600, size: 26pt * heading-scale, fill: accent)
    set align(center)
    block(above: 24pt, below: 16pt)[
      #it.body
      #v(8pt)
      #line(length: 40%, stroke: 1pt + accent)
    ]
  }
  
  // Second level
  show heading.where(level: 2): it => {
    set text(font: main-font, weight: 600, size: 16pt * heading-scale, fill: accent)
    set par(first-line-indent: 0pt)
    block(above: 16pt, below: 10pt)[
      #it.body
    ]
  }
  
  // Third level
  show heading.where(level: 3): it => {
    set text(font: main-font, weight: 600, size: 12pt, style: "italic", fill: accent)
    set par(first-line-indent: 0pt)
    block(above: 12pt, below: 8pt)[
      #it.body
    ]
  }
  
  // Separator - Ornamental
  show line: it => {
    set align(center)
    block(above: 16pt, below: 16pt)[
      #text(size: 14pt, fill: rgb(120, 120, 120))[❦]
    ]
  }
  
  // Blockquotes - Classic style
  show quote: it => [
    #set text(size: 10.5pt, style: "italic", fill: rgb(70, 70, 70))
    #set par(first-line-indent: 0pt)
    #pad(left: 32pt, right: 32pt, top: 14pt, bottom: 14pt)[
      #it
    ]
  ]
  
  // Code blocks
  show raw.where(block: true): it => block(
    width: 100%,
    fill: rgb(250, 250, 248),
    inset: 10pt,
  )[
    #set text(font: "DejaVu Sans Mono", size: 9.5pt)
    #it
  ]
  
  // Inline code
  show raw.where(block: false): it => box(
    fill: rgb(245, 245, 243),
    inset: (x: 3pt, y: 0pt),
    outset: (y: 3pt),
  )[
    #set text(font: "DejaVu Sans Mono", size: 10pt)
    #it
  ]
  
  // Lists
  set list(marker: ([—], [•], [◦]), indent: 15pt)
  set enum(indent: 15pt)
  
  // Links
  show link: it => {
    set text(fill: rgb(60, 60, 80))
    underline(it)
  }
  
  // Emphasis
  show emph: set text(style: "italic")
  show strong: set text(weight: 700)
  
  doc
}
