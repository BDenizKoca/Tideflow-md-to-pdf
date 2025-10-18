use anyhow::Result;
use pulldown_cmark::{Event, Options, Parser, Tag};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize)]
pub struct EditorPosition {
    pub offset: usize,
    pub line: usize,
    pub column: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct PdfPosition {
    pub page: usize,
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnchorEntry {
    pub id: String,
    pub editor: EditorPosition,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pdf: Option<PdfPosition>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct SourceMapPayload {
    pub anchors: Vec<AnchorEntry>,
}

#[derive(Debug, Clone)]
pub struct AnchorMeta {
    pub id: String,
    pub offset: usize,
    pub line: usize,
    pub column: usize,
}

#[derive(Debug, Clone)]
pub struct PreprocessorOutput {
    pub markdown: String,
    pub anchors: Vec<AnchorMeta>,
}

/// Transform user markdown by injecting invisible Typst anchors used for scroll synchronisation.
pub fn preprocess_markdown(markdown: &str) -> Result<PreprocessorOutput> {
    let result = inject_anchors(markdown)?;
    Ok(result)
}



fn inject_anchors(markdown: &str) -> Result<PreprocessorOutput> {
    let mut insertions: Vec<(usize, String)> = Vec::new();
    let mut anchors: Vec<AnchorMeta> = Vec::new();
    let mut seen_offsets: HashSet<usize> = HashSet::new();

    // Ensure there's always a document-start anchor so preview can scroll to
    // the top even when a cover page is rendered above content.
    let doc_id = "tf-doc-start".to_string();
    if !seen_offsets.contains(&0) {
            let doc_anchor = build_anchor_markup(markdown, 0, &doc_id);
        insertions.push((0, doc_anchor));
        anchors.push(AnchorMeta {
            id: doc_id.clone(),
            offset: 0,
            line: 0,
            column: 0,
        });
        seen_offsets.insert(0usize);
    }

    let parser = Parser::new_ext(
        markdown,
        Options::ENABLE_FOOTNOTES 
            | Options::ENABLE_TASKLISTS 
            | Options::ENABLE_STRIKETHROUGH 
            | Options::ENABLE_TABLES
            | Options::ENABLE_SMART_PUNCTUATION
            | Options::ENABLE_HEADING_ATTRIBUTES,
    );
    for (event, range) in parser.into_offset_iter() {
        if let Event::Start(tag) = event {
            if !is_block_level(&tag) {
                continue;
            }
            
            // SKIP blockquote tags - they cause issues because the anchor gets inserted
            // between the '>' and the content. We'll still get anchors from the paragraphs
            // inside the blockquote, which is sufficient for scrolling.
            if matches!(tag, Tag::BlockQuote) {
                continue;
            }
            
            let insertion_offset = range.start;
            
            // If we're inserting into a blockquote line (starts with '>'), SKIP it entirely.
            // Blockquotes (including admonitions) will get anchored via their inner paragraphs.
            let mut line_start = insertion_offset;
            while line_start > 0 && markdown.as_bytes()[line_start - 1] != b'\n' {
                line_start -= 1;
            }
            
            // Check if this line starts with '>' (possibly with whitespace before)
            let line_text = &markdown[line_start..];
            let first_line = line_text.split('\n').next().unwrap_or("");
            if first_line.trim_start().starts_with('>') {
                // Skip this anchor entirely - don't insert into blockquote lines
                continue;
            }
            
            if !seen_offsets.insert(insertion_offset) {
                continue;
            }
            let id = format!("tf-{}-{}", range.start, anchors.len());
            let (line, column) = offset_to_line_column(markdown, range.start);
            let anchor_markup = build_anchor_markup(markdown, insertion_offset, &id);
            insertions.push((insertion_offset, anchor_markup));
            anchors.push(AnchorMeta {
                id,
                offset: range.start,
                line,
                column,
            });
        }
    }

    insertions.sort_by_key(|(offset, _)| *offset);
    let mut output = markdown.to_owned();
    for (offset, snippet) in insertions.into_iter().rev() {
        output.insert_str(offset, &snippet);
    }

    Ok(PreprocessorOutput {
        markdown: output,
        anchors,
    })
}

fn is_block_level(tag: &Tag<'_>) -> bool {
    matches!(
        tag,
        Tag::Paragraph
            | Tag::Heading(..)
            | Tag::BlockQuote
            | Tag::CodeBlock(_)
            | Tag::List(_)
            | Tag::Item
            | Tag::FootnoteDefinition(_)
            | Tag::Table(_)
            | Tag::TableHead
            | Tag::TableRow
            | Tag::TableCell
    )
}

fn offset_to_line_column(source: &str, offset: usize) -> (usize, usize) {
    let mut line = 0;
    let mut column = 0;
    for ch in source[..offset].chars() {
        if ch == '\n' {
            line += 1;
            column = 0;
        } else {
            column += 1;
        }
    }
    (line, column)
}

fn build_anchor_markup(source: &str, offset: usize, id: &str) -> String {
    let mut snippet = String::new();
    
    // Original logic - ensure we're on a new line
    if offset > 0 {
        let preceding = &source[..offset];
        if !preceding.ends_with('\n') {
            snippet.push('\n');
        }
    }
    // Inject a literal label call so Typst sees a label node it can query.
    // A bare label is accepted by Typst and will be discoverable by `typst query`.
    snippet.push_str("<!--raw-typst #label(\"");
    snippet.push_str(id);
    snippet.push_str("\") -->\n");
    snippet
}

pub fn attach_pdf_positions(
    anchors: &[AnchorMeta],
    positions: &HashMap<String, PdfPosition>,
) -> SourceMapPayload {
    let entries = anchors
        .iter()
        .map(|anchor| AnchorEntry {
            id: anchor.id.clone(),
            editor: EditorPosition {
                offset: anchor.offset,
                line: anchor.line,
                column: anchor.column,
            },
            pdf: positions.get(&anchor.id).cloned(),
        })
        .collect();

    SourceMapPayload { anchors: entries }
}

#[allow(dead_code)]
pub fn anchors_to_lookup(anchors: &[AnchorMeta]) -> HashMap<String, EditorPosition> {
    anchors
        .iter()
        .map(|anchor| {
            (
                anchor.id.clone(),
                EditorPosition {
                    offset: anchor.offset,
                    line: anchor.line,
                    column: anchor.column,
                },
            )
        })
        .collect()
}

pub fn pdf_positions_from_query(json_bytes: &[u8]) -> Result<HashMap<String, PdfPosition>> {
    let value: serde_json::Value = serde_json::from_slice(json_bytes)?;
    let mut map = HashMap::new();
    if let Some(entries) = value.as_array() {
        for entry in entries {
            if let Some(label) = find_label(entry) {
                if !label.starts_with("tf-") {
                    continue;
                }
                // Try to find a location object anywhere under this entry. Typst
                // output varies by version and query shape; search for common
                // variants such as { location: { page, position: { x,y } } }
                // or nested fields like 'point', 'pos', or 'rect'.
                if let Some((page, x, y)) = find_location(entry) {
                    map.insert(label, PdfPosition { page, x, y });
                }
            }
        }
    }
    Ok(map)
}

fn find_label(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::Object(map) => {
            if let Some(label) = map.get("label").and_then(|v| v.as_str()) {
                return Some(label.to_owned());
            }
            for key in ["value", "target", "node", "fields"] {
                if let Some(child) = map.get(key) {
                    if let Some(found) = find_label(child) {
                        return Some(found);
                    }
                }
            }
            None
        }
        serde_json::Value::Array(arr) => arr.iter().find_map(find_label),
        _ => None,
    }
}

/// Recursively search a serde_json::Value for a location-like object and extract
/// (page, x, y) if possible. Supports keys: location, page, position, point,
/// pos, rect (rect may provide [x0,y0,x1,y1] coords; we use y0 as baseline).
fn find_location(value: &serde_json::Value) -> Option<(usize, f32, f32)> {
    match value {
        serde_json::Value::Object(map) => {
            // Direct location field
            if let Some(loc) = map.get("location") {
                if let Some(res) = extract_page_xy(loc) {
                    return Some(res);
                }
            }
            // Some outputs might put page/position at top-level
            if let Some(res) = extract_page_xy(&serde_json::Value::Object(map.clone())) {
                return Some(res);
            }
            // Recurse into children
            for (_k, v) in map.iter() {
                if let Some(found) = find_location(v) {
                    return Some(found);
                }
            }
            None
        }
        serde_json::Value::Array(arr) => arr.iter().find_map(find_location),
        _ => None,
    }
}

fn extract_page_xy(v: &serde_json::Value) -> Option<(usize, f32, f32)> {
    if let Some(obj) = v.as_object() {
        // Page
        // Page may be numeric or string; accept both
        let page = obj
            .get("page")
            .and_then(|p| p.as_u64().or_else(|| p.as_str().and_then(|s| s.parse::<u64>().ok())))
            .unwrap_or(1) as usize;

        // Position variants
        if let Some(pos) = obj.get("position").or_else(|| obj.get("point")).or_else(|| obj.get("pos")) {
            if let Some(pos_obj) = pos.as_object() {
                let x = pos_obj
                    .get("x")
                    .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse::<f64>().ok())))
                    .unwrap_or(0.0) as f32;
                let y = pos_obj
                    .get("y")
                    .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse::<f64>().ok())))
                    .unwrap_or(0.0) as f32;
                return Some((page, x, y));
            }
        }

        // rect variant: [x0, y0, x1, y1]
        if let Some(rect) = obj.get("rect") {
            if let Some(arr) = rect.as_array() {
                if arr.len() >= 2 {
                    let x = arr[0]
                        .as_f64()
                        .or_else(|| arr[0].as_str().and_then(|s| s.parse::<f64>().ok()))
                        .unwrap_or(0.0) as f32;
                    let y = arr[1]
                        .as_f64()
                        .or_else(|| arr[1].as_str().and_then(|s| s.parse::<f64>().ok()))
                        .unwrap_or(0.0) as f32;
                    return Some((page, x, y));
                }
            }
        }
    }
    None
}

