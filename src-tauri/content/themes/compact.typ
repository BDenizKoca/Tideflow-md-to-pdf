// Compact Theme
// Dense technical layout for maximum content density

#let compact_theme(prefs, doc) = {
  let main-font = prefs.fonts.at("main", default: "Arial")
  let mono-font = prefs.fonts.at("mono", default: "Courier New")
  let font-size = prefs.at("font_size", default: 10) * 1pt
  let page-bg = rgb(prefs.at("page_bg_color", default: "#ffffff"))
  let font-color = rgb(prefs.at("font_color", default: "#000000"))
  let accent = rgb(prefs.at("accent_color", default: "#000000"))
  let heading-scale = prefs.at("heading_scale", default: 0.9)
  
  set page(
    paper: prefs.papersize,
    margin: (x: 1.2cm, y: 1.5cm),
    fill: page-bg,
  )
  set text(font: main-font, size: font-size, lang: "en", fill: font-color, fallback: true)
  set par(leading: 0.5em, spacing: 0.65em, justify: true, first-line-indent: 0pt)
  show raw: set text(font: mono-font, size: font-size * 0.9, fallback: true)
  
  // Code blocks compact
  show raw.where(block: true): block.with(
    inset: 6pt,
    fill: rgb(245, 245, 245),
    stroke: 0.5pt + rgb(200, 200, 200),
    radius: 2pt
  )

  // Headings: compact, bold, all-caps for H1
  show heading.where(level: 1): it => {
    set text(
      font: main-font,
      weight: 900,
      size: 15pt * heading-scale,
      fill: accent,
    )
    block(above: 12pt, below: 6pt)[#it]
  }
  
  show heading.where(level: 2): it => {
    set text(
      font: main-font,
      weight: 800,
      size: 11pt * heading-scale,
      fill: accent,
    )
    block(above: 8pt, below: 4pt)[#it]
  }
  
  show heading.where(level: 3): it => {
    set text(
      font: main-font,
      weight: 700,
      size: 9pt * heading-scale,
      fill: font-color,
    )
    block(above: 6pt, below: 3pt)[#it]
  }

  // Separator as solid line
  show line: it => block(
    width: 100%,
    height: 1pt,
    above: 6pt,
    below: 6pt,
    fill: rgb(0, 0, 0)
  )

  // Blockquotes with gray background
  show quote: it => [
    #set text(size: 8.5pt, style: "italic")
    #pad(left: 16pt, right: 16pt, top: 5pt, bottom: 5pt)[
      #it
    ]
  ]

  // Dense lists
  set list(indent: 8pt, body-indent: 4pt, marker: ([▪], [▫], [‣]))
  set enum(indent: 8pt, body-indent: 4pt)

  // Links bold
  show link: it => underline(text(weight: 700)[#it])

  // Strong extra bold
  show strong: it => text(weight: 900)[#it]

  doc
}
