//! Markdown preprocessor for Tideflow.
//!
//! This module transforms markdown by injecting invisible Typst anchors
//! for bidirectional scroll synchronization between the editor and PDF preview.
//!
//! # Module Structure
//!
//! - `types`: Core data structures for positions and anchors
//! - `normalize`: Markdown normalization (frontmatter, tables)
//! - `anchors`: Anchor injection logic
//! - `source_map`: PDF position mapping utilities

mod anchors;
mod normalize;
mod source_map;
mod types;

// Re-export public API
pub use source_map::{attach_pdf_positions, pdf_positions_from_query};
pub use types::{
    offset_to_line_column, AnchorMeta, PdfPosition, PreprocessorOutput, SourceMapPayload,
};
// These are used by other modules but may not be used directly by lib.rs consumers
#[allow(unused_imports)]
pub use types::{anchors_to_lookup, AnchorEntry, EditorPosition};

use anyhow::Result;
use normalize::{ensure_blank_lines_before_tables, split_frontmatter};
use anchors::inject_anchors;

/// Transform user markdown by injecting invisible Typst anchors for scroll sync.
///
/// This is the main entry point for the preprocessor. It:
/// 1. Preserves YAML frontmatter if present
/// 2. Normalizes markdown (ensures blank lines before tables)
/// 3. Injects anchor labels for scroll synchronization
/// 4. Generates heading labels for internal links
///
/// # Example
///
/// ```ignore
/// let output = preprocess_markdown("# Hello\n\nWorld")?;
/// // output.markdown contains anchors like <!--raw-typst #label("hello") -->
/// // output.anchors contains metadata for each anchor
/// ```
pub fn preprocess_markdown(markdown: &str) -> Result<PreprocessorOutput> {
    // Skip YAML frontmatter if present
    let (frontmatter, content) = split_frontmatter(markdown);
    
    // Normalize markdown: ensure blank line before tables
    let normalized = ensure_blank_lines_before_tables(content);
    let mut result = inject_anchors(&normalized)?;
    
    // Prepend frontmatter back if it existed
    if !frontmatter.is_empty() {
        result.markdown = format!("{}\n{}", frontmatter, result.markdown);
        
        // Adjust all anchor offsets to account for frontmatter
        let offset_adjustment = frontmatter.len() + 1; // +1 for the newline we added
        for anchor in &mut result.anchors {
            anchor.offset += offset_adjustment;
            let (line, column) = offset_to_line_column(&result.markdown, anchor.offset);
            anchor.line = line;
            anchor.column = column;
        }
    }
    
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preprocess_basic() {
        let md = "# Hello\n\nParagraph here.";
        let result = preprocess_markdown(md).unwrap();
        
        assert!(result.markdown.contains("tf-doc-start"));
        assert!(result.markdown.contains("#label(\"hello\")"));
        assert!(!result.anchors.is_empty());
    }

    #[test]
    fn test_preprocess_with_frontmatter() {
        let md = "---\ntitle: Test\n---\n\n# Hello";
        let result = preprocess_markdown(md).unwrap();
        
        assert!(result.markdown.starts_with("---\ntitle: Test\n---"));
        assert!(result.markdown.contains("#label(\"hello\")"));
    }

    #[test]
    fn test_duplicate_headings() {
        let md = "# Intro\n\n# Intro\n\n# Intro";
        let result = preprocess_markdown(md).unwrap();
        
        assert!(result.markdown.contains("#label(\"intro\")"));
        assert!(result.markdown.contains("#label(\"intro-1\")"));
        assert!(result.markdown.contains("#label(\"intro-2\")"));
    }
}
