//! Core types for the markdown preprocessor.

use serde::Serialize;
use std::collections::HashMap;

/// Position in the editor (source markdown).
#[derive(Debug, Clone, Serialize)]
pub struct EditorPosition {
    pub offset: usize,
    pub line: usize,
    pub column: usize,
}

/// Position in the rendered PDF.
#[derive(Debug, Clone, Serialize)]
pub struct PdfPosition {
    pub page: usize,
    pub x: f32,
    pub y: f32,
}

/// A single anchor entry combining editor and PDF positions.
#[derive(Debug, Clone, Serialize)]
pub struct AnchorEntry {
    pub id: String,
    pub editor: EditorPosition,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pdf: Option<PdfPosition>,
}

/// Payload for the source map sent to the frontend.
#[derive(Debug, Clone, Serialize, Default)]
pub struct SourceMapPayload {
    pub anchors: Vec<AnchorEntry>,
}

/// Metadata about an anchor during preprocessing.
#[derive(Debug, Clone)]
pub struct AnchorMeta {
    pub id: String,
    pub offset: usize,
    pub line: usize,
    pub column: usize,
}

/// Output from the preprocessor containing processed markdown and anchor metadata.
#[derive(Debug, Clone)]
pub struct PreprocessorOutput {
    pub markdown: String,
    pub anchors: Vec<AnchorMeta>,
}

/// Convert a byte offset to (line, column) in the source.
pub fn offset_to_line_column(source: &str, offset: usize) -> (usize, usize) {
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

/// Build a lookup table from anchor ID to editor position.
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
