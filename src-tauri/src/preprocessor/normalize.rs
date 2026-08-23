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

/// Return the fence marker a line opens a fenced code block with, if any.
fn opening_fence(trimmed: &str) -> Option<(char, usize)> {
    for marker in ['`', '~'] {
        let len = trimmed.chars().take_while(|c| *c == marker).count();
        if len >= 3 {
            return Some((marker, len));
        }
    }
    None
}

/// Turn single newlines into hard line breaks.
///
/// Markdown folds a single newline into a space; documents written one line per
/// line (addresses, changelogs, poetry) expect every newline to survive. This
/// appends the CommonMark hard-break marker (two trailing spaces) to lines
/// followed by more text in the same block, which cmarker renders as a Typst
/// linebreak. Fenced code, `$$` math, and lines that already break are skipped.
///
/// Lines are only ever extended, never added or removed, so anchor line numbers
/// stay aligned with the editor.
pub fn apply_hard_linebreaks(markdown: &str) -> String {
    let lines: Vec<&str> = markdown.lines().collect();
    let mut result = Vec::with_capacity(lines.len());
    let mut code_fence: Option<(char, usize)> = None;
    let mut in_math_block = false;

    for (i, line) in lines.iter().enumerate() {
        let trimmed_start = line.trim_start();
        let indent = line.len() - trimmed_start.len();
        let trimmed = trimmed_start.trim_end();

        // Fenced code blocks are verbatim; the fence lines themselves too.
        if let Some((marker, len)) = code_fence {
            let closes = indent <= 3
                && trimmed.len() >= len
                && trimmed.chars().all(|c| c == marker);
            if closes {
                code_fence = None;
            }
            result.push(line.to_string());
            continue;
        }
        if indent <= 3 {
            if let Some(fence) = opening_fence(trimmed) {
                code_fence = Some(fence);
                result.push(line.to_string());
                continue;
            }
        }

        // `$$` display math is handed to mitex as-is; a stray break marker
        // inside it would end up in the LaTeX source.
        let was_in_math = in_math_block;
        if trimmed.matches("$$").count() % 2 == 1 {
            in_math_block = !in_math_block;
        }
        if was_in_math || in_math_block {
            result.push(line.to_string());
            continue;
        }

        let next_continues = lines
            .get(i + 1)
            .map(|next| !next.trim().is_empty())
            .unwrap_or(false);
        let already_breaks = line.ends_with("  ") || trimmed.ends_with('\\');

        if next_continues && !trimmed.is_empty() && !already_breaks {
            result.push(format!("{}  ", line.trim_end()));
        } else {
            result.push(line.to_string());
        }
    }

    result.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hard_linebreaks_paragraph() {
        let md = "first line\nsecond line\n\nnext paragraph";
        let result = apply_hard_linebreaks(md);
        assert_eq!(result, "first line  \nsecond line\n\nnext paragraph");
    }

    #[test]
    fn test_hard_linebreaks_preserves_line_count() {
        let md = "a\nb\n\nc\n```\nx\ny\n```\nd";
        assert_eq!(
            apply_hard_linebreaks(md).lines().count(),
            md.lines().count()
        );
    }

    #[test]
    fn test_hard_linebreaks_skips_code_and_math() {
        let md = "```\ncode one\ncode two\n```\n\n$$\na + b\nc + d\n$$";
        let result = apply_hard_linebreaks(md);
        assert!(result.contains("code one\ncode two"));
        assert!(result.contains("a + b\nc + d"));
    }

    #[test]
    fn test_hard_linebreaks_does_not_double_up() {
        let md = "already broken  \nbackslash break\\\ntail";
        let result = apply_hard_linebreaks(md);
        assert_eq!(result, "already broken  \nbackslash break\\\ntail");
    }

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
