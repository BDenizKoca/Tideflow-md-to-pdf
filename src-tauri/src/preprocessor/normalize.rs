//! Markdown normalization utilities.
//! 
//! These functions prepare markdown for processing by fixing common formatting
//! issues that could cause problems during anchor injection or rendering.

/// Split YAML frontmatter from markdown content.
/// 
/// Returns (frontmatter, content) where frontmatter includes the `---` delimiters.
/// If no valid frontmatter is found, returns ("", original_markdown).
pub fn split_frontmatter(markdown: &str) -> (&str, &str) {
    let trimmed = markdown.trim_start();
    
    // Must start with ---
    if !trimmed.starts_with("---") {
        return ("", markdown);
    }
    
    // Find the start of --- in original string
    let start_offset = markdown.len() - trimmed.len();
    let after_start = &markdown[start_offset + 3..];
    
    // Find the closing ---
    if let Some(end_pos) = after_start.find("\n---") {
        // Include the closing --- and its newline
        let end_offset = start_offset + 3 + end_pos + 4; // +4 for "\n---"
        
        // Skip any trailing newline after closing ---
        let mut final_offset = end_offset;
        if final_offset < markdown.len() && markdown.as_bytes()[final_offset] == b'\n' {
            final_offset += 1;
        }
        
        return (&markdown[..final_offset], &markdown[final_offset..]);
    }
    
    // No closing ---, treat as no frontmatter
    ("", markdown)
}

/// Ensure there's always a blank line before markdown tables.
/// 
/// This fixes a common issue where tables immediately following paragraphs
/// aren't parsed correctly by some markdown processors.
pub fn ensure_blank_lines_before_tables(markdown: &str) -> String {
    let lines: Vec<&str> = markdown.lines().collect();
    let mut result = Vec::with_capacity(lines.len() + 10);

    for i in 0..lines.len() {
        let line = lines[i];
        let is_table_line = line.trim_start().starts_with('|');

        // Check if this is the start of a table (first table row)
        let is_table_start = is_table_line 
            && (i == 0 || !lines[i - 1].trim_start().starts_with('|'));

        // If starting a table and previous line isn't blank, add blank line
        if is_table_start && i > 0 && !lines[i - 1].trim().is_empty() {
            result.push("");
        }

        result.push(line);
    }

    result.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_frontmatter_basic() {
        let md = "---\ntitle: Test\n---\n\n# Hello";
        let (fm, content) = split_frontmatter(md);
        assert!(fm.starts_with("---"));
        assert!(fm.ends_with("---\n"));
        assert!(content.starts_with("\n# Hello"));
    }

    #[test]
    fn test_split_frontmatter_none() {
        let md = "# Hello\n\nWorld";
        let (fm, content) = split_frontmatter(md);
        assert_eq!(fm, "");
        assert_eq!(content, md);
    }

    #[test]
    fn test_table_blank_line() {
        let md = "Some text\n| A | B |\n|---|---|";
        let result = ensure_blank_lines_before_tables(md);
        assert!(result.contains("Some text\n\n| A | B |"));
    }
}
