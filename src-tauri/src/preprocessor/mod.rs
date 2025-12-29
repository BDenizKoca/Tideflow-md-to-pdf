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
use regex::Regex;

/// Convert Pandoc-style citations to Typst format.
///
/// Converts:
/// - `[@key]` → `<!--raw-typst #cite(<key>) -->`
/// - `[@key1; @key2]` → `<!--raw-typst #cite(<key1>) #cite(<key2>) -->`
/// - `[@key, p. 42]` → `<!--raw-typst #cite(<key>, supplement: [p. 42]) -->`
///
/// This enables bibliography support using familiar Pandoc citation syntax.
fn convert_citations(markdown: &str) -> String {
    // Regex to match Pandoc citations: [@key] or [@key, supplement]
    // Pattern matches: [@citation-key] or [@key1; @key2] or [@key, p. 42]
    let re = Regex::new(r"\[@([^\]]+)\]").unwrap();

    re.replace_all(markdown, |caps: &regex::Captures| {
        let inner = &caps[1];

        // Check if this is multiple citations (contains semicolon)
        if inner.contains(';') {
            // Multiple citations: [@key1; @key2] → #cite(<key1>) #cite(<key2>)
            let citations: Vec<&str> = inner.split(';')
                .map(|s| s.trim().trim_start_matches('@'))
                .filter(|key| !key.is_empty()) // Skip empty keys
                .collect();

            // If no valid citations, return original text
            if citations.is_empty() {
                return caps[0].to_string();
            }

            let cite_calls = citations.iter()
                .map(|key| format!("#cite(<{}>)", key))
                .collect::<Vec<_>>()
                .join(" ");
            format!("<!--raw-typst {} -->", cite_calls)
        } else if inner.contains(',') {
            // Citation with supplement: [@key, p. 42] → #cite(<key>, supplement: [p. 42])
            let parts: Vec<&str> = inner.splitn(2, ',').collect();
            let key = parts[0].trim().trim_start_matches('@');

            // If key is empty, return original text
            if key.is_empty() {
                return caps[0].to_string();
            }

            let supplement = parts[1].trim();
            format!("<!--raw-typst #cite(<{}>, supplement: [{}]) -->", key, supplement)
        } else {
            // Simple citation: [@key] → #cite(<key>)
            let key = inner.trim().trim_start_matches('@');

            // If key is empty, return original text (incomplete citation)
            if key.is_empty() {
                return caps[0].to_string();
            }

            format!("<!--raw-typst #cite(<{}>) -->", key)
        }
    }).to_string()
}

/// Transform user markdown by injecting invisible Typst anchors for scroll sync.
///
/// This is the main entry point for the preprocessor. It:
/// 1. Preserves YAML frontmatter if present
/// 2. Converts Pandoc-style citations to Typst format (only if has_bibliography is true)
/// 3. Normalizes markdown (ensures blank lines before tables)
/// 4. Injects anchor labels for scroll synchronization
/// 5. Generates heading labels for internal links
///
/// # Arguments
///
/// * `markdown` - The raw markdown content
/// * `has_bibliography` - If true, converts [@key] citations to #cite() calls. If false, leaves citations as plain text to prevent crashes.
///
/// # Example
///
/// ```ignore
/// let output = preprocess_markdown("# Hello\n\nWorld", true)?;
/// // output.markdown contains anchors like <!--raw-typst #label("hello") -->
/// // output.anchors contains metadata for each anchor
/// ```
pub fn preprocess_markdown(markdown: &str, has_bibliography: bool) -> Result<PreprocessorOutput> {
    // Skip YAML frontmatter if present
    let (frontmatter, content) = split_frontmatter(markdown);

    // Convert Pandoc citations to Typst format ONLY if bibliography is loaded
    // This prevents "document does not contain a bibliography" errors
    let with_citations = if has_bibliography {
        convert_citations(content)
    } else {
        content.to_string()
    };

    // Normalize markdown: ensure blank line before tables
    let normalized = ensure_blank_lines_before_tables(&with_citations);
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
        let result = preprocess_markdown(md, false).unwrap();

        assert!(result.markdown.contains("tf-doc-start"));
        assert!(result.markdown.contains("#label(\"hello\")"));
        assert!(!result.anchors.is_empty());
    }

    #[test]
    fn test_preprocess_with_frontmatter() {
        let md = "---\ntitle: Test\n---\n\n# Hello";
        let result = preprocess_markdown(md, false).unwrap();

        assert!(result.markdown.starts_with("---\ntitle: Test\n---"));
        assert!(result.markdown.contains("#label(\"hello\")"));
    }

    #[test]
    fn test_duplicate_headings() {
        let md = "# Intro\n\n# Intro\n\n# Intro";
        let result = preprocess_markdown(md, false).unwrap();

        assert!(result.markdown.contains("#label(\"intro\")"));
        assert!(result.markdown.contains("#label(\"intro-1\")"));
        assert!(result.markdown.contains("#label(\"intro-2\")"));
    }

    #[test]
    fn test_citation_conversion() {
        // Simple citation - WITH bibliography
        let md = "According to Einstein [@einstein1905], ...";
        let result = preprocess_markdown(md, true).unwrap();
        assert!(result.markdown.contains("#cite(<einstein1905>)"));
        assert!(!result.markdown.contains("[@einstein1905]"));

        // Multiple citations - WITH bibliography
        let md2 = "Multiple sources [@knuth1984; @lamport1986] show...";
        let result2 = preprocess_markdown(md2, true).unwrap();
        assert!(result2.markdown.contains("#cite(<knuth1984>) #cite(<lamport1986>)"));

        // Citation with page number - WITH bibliography
        let md3 = "See [@einstein1905, p. 42] for details.";
        let result3 = preprocess_markdown(md3, true).unwrap();
        assert!(result3.markdown.contains("#cite(<einstein1905>, supplement: [p. 42])"));
    }

    #[test]
    fn test_citation_no_conversion_without_bibliography() {
        // Without bibliography, citations should remain as plain text to prevent crashes
        let md = "According to Einstein [@einstein1905], multiple sources [@knuth1984; @lamport1986] show...";
        let result = preprocess_markdown(md, false).unwrap();

        // Citations should NOT be converted
        assert!(!result.markdown.contains("#cite("));
        // Original citations should be preserved
        assert!(result.markdown.contains("[@einstein1905]"));
        assert!(result.markdown.contains("[@knuth1984; @lamport1986]"));
    }
}
