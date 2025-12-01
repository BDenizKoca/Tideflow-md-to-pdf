//! Source map utilities for mapping PDF positions back to editor positions.

use anyhow::Result;
use std::collections::HashMap;

use super::types::{AnchorEntry, AnchorMeta, EditorPosition, PdfPosition, SourceMapPayload};

/// Attach PDF positions to anchor metadata to create a complete source map.
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

/// Parse PDF positions from Typst query JSON output.
pub fn pdf_positions_from_query(json_bytes: &[u8]) -> Result<HashMap<String, PdfPosition>> {
    let value: serde_json::Value = serde_json::from_slice(json_bytes)?;
    let mut map = HashMap::new();
    
    if let Some(entries) = value.as_array() {
        for entry in entries {
            if let Some(label) = find_label(entry) {
                if !label.starts_with("tf-") {
                    continue;
                }
                if let Some((page, x, y)) = find_location(entry) {
                    map.insert(label, PdfPosition { page, x, y });
                }
            }
        }
    }
    Ok(map)
}

/// Recursively search for a label in a JSON value.
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

/// Recursively search for location data (page, x, y) in a JSON value.
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

/// Extract page and x/y coordinates from a JSON object.
fn extract_page_xy(v: &serde_json::Value) -> Option<(usize, f32, f32)> {
    let obj = v.as_object()?;
    
    // Page may be numeric or string
    let page = obj
        .get("page")
        .and_then(|p| p.as_u64().or_else(|| p.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(1) as usize;

    // Try position/point/pos variants
    if let Some(pos) = obj.get("position").or_else(|| obj.get("point")).or_else(|| obj.get("pos")) {
        if let Some(pos_obj) = pos.as_object() {
            let x = parse_coordinate(pos_obj.get("x"));
            let y = parse_coordinate(pos_obj.get("y"));
            return Some((page, x, y));
        }
    }

    // Try rect variant: [x0, y0, x1, y1]
    if let Some(arr) = obj.get("rect").and_then(|r| r.as_array()) {
        if arr.len() >= 2 {
            let x = parse_coordinate(Some(&arr[0]));
            let y = parse_coordinate(Some(&arr[1]));
            return Some((page, x, y));
        }
    }

    None
}

/// Parse a coordinate value that may be a number or string.
fn parse_coordinate(value: Option<&serde_json::Value>) -> f32 {
    value
        .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0) as f32
}
