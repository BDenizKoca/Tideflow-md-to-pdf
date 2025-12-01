//! Anchor injection for scroll synchronization.
//!
//! This module handles the injection of Typst label anchors into markdown
//! content for bidirectional scroll sync between editor and PDF preview.

use anyhow::Result;
use pulldown_cmark::{CodeBlockKind, Event, Options, Parser, Tag};
use std::collections::{HashMap, HashSet};

use super::types::{offset_to_line_column, AnchorMeta, PreprocessorOutput};

/// Inject Typst anchors into markdown for scroll synchronization.
pub fn inject_anchors(markdown: &str) -> Result<PreprocessorOutput> {
    let mut ctx = InjectionContext::new(markdown);
    ctx.process()?;
    ctx.build_output(markdown)
}

/// Context for anchor injection, tracking state during markdown parsing.
struct InjectionContext<'a> {
    markdown: &'a str,
    insertions: Vec<(usize, String)>,
    anchors: Vec<AnchorMeta>,
    seen_offsets: HashSet<usize>,
    
    // Heading tracking
    current_heading_text: String,
    current_heading_explicit_id: Option<String>,
    in_heading: bool,
    slug_counts: HashMap<String, usize>,
    
    // Element counters
    table_depth: usize,
    code_block_count: usize,
    image_count: usize,
    hr_count: usize,
}

impl<'a> InjectionContext<'a> {
    fn new(markdown: &'a str) -> Self {
        Self {
            markdown,
            insertions: Vec::new(),
            anchors: Vec::new(),
            seen_offsets: HashSet::new(),
            current_heading_text: String::new(),
            current_heading_explicit_id: None,
            in_heading: false,
            slug_counts: HashMap::new(),
            table_depth: 0,
            code_block_count: 0,
            image_count: 0,
            hr_count: 0,
        }
    }

    fn process(&mut self) -> Result<()> {
        // Add document start anchor
        self.add_doc_start_anchor();
        
        // Parse and process markdown events
        let parser = Parser::new_ext(
            self.markdown,
            Options::ENABLE_FOOTNOTES
                | Options::ENABLE_TASKLISTS
                | Options::ENABLE_STRIKETHROUGH
                | Options::ENABLE_TABLES
                | Options::ENABLE_SMART_PUNCTUATION
                | Options::ENABLE_HEADING_ATTRIBUTES,
        );

        for (event, range) in parser.into_offset_iter() {
            self.handle_event(event, range);
        }
        
        Ok(())
    }

    fn add_doc_start_anchor(&mut self) {
        let id = "tf-doc-start".to_string();
        let markup = build_anchor_markup(self.markdown, 0, &id, false);
        self.insertions.push((0, markup));
        self.anchors.push(AnchorMeta {
            id,
            offset: 0,
            line: 0,
            column: 0,
        });
        self.seen_offsets.insert(0);
    }

    fn handle_event(&mut self, event: Event, range: std::ops::Range<usize>) {
        match event {
            Event::Start(Tag::Heading(_, id, _)) => {
                self.current_heading_text.clear();
                self.in_heading = true;
                self.current_heading_explicit_id = id.map(|s| s.to_string());
            }
            
            Event::Text(text) if self.in_heading => {
                self.current_heading_text.push_str(&text);
            }
            
            Event::End(Tag::Heading(..)) if self.in_heading => {
                self.handle_heading_end(range);
            }
            
            Event::Rule => {
                self.handle_horizontal_rule(range);
            }
            
            Event::Start(Tag::Table(_)) 
            | Event::Start(Tag::TableHead) 
            | Event::Start(Tag::TableRow) 
            | Event::Start(Tag::TableCell) => {
                self.table_depth = self.table_depth.saturating_add(1);
            }
            
            Event::End(Tag::Table(_)) 
            | Event::End(Tag::TableHead) 
            | Event::End(Tag::TableRow) 
            | Event::End(Tag::TableCell) => {
                self.table_depth = self.table_depth.saturating_sub(1);
                self.in_heading = false;
            }
            
            Event::End(_) => {
                self.in_heading = false;
            }
            
            Event::Start(tag) => {
                self.handle_start_tag(tag, range);
            }
            
            _ => {}
        }
    }

    fn handle_heading_end(&mut self, range: std::ops::Range<usize>) {
        let base_slug = if let Some(ref id) = self.current_heading_explicit_id {
            id.clone()
        } else {
            slugify(&self.current_heading_text)
        };
        
        if base_slug.is_empty() {
            self.in_heading = false;
            self.current_heading_explicit_id = None;
            return;
        }
        
        // Handle duplicate slugs GitHub-style
        let count = self.slug_counts.entry(base_slug.clone()).or_insert(0);
        let slug = if *count == 0 {
            base_slug.clone()
        } else {
            format!("{}-{}", base_slug, count)
        };
        *count += 1;

        let insertion_point = self.find_line_end(range.start);

        if !self.seen_offsets.contains(&insertion_point) {
            let markup = format!(" <!--raw-typst #label(\"{}\") -->", slug);
            self.insertions.push((insertion_point, markup));
            self.seen_offsets.insert(insertion_point);
            
            let (line, column) = offset_to_line_column(self.markdown, range.start);
            self.anchors.push(AnchorMeta {
                id: slug,
                offset: range.start,
                line,
                column,
            });
        }
        
        self.in_heading = false;
        self.current_heading_explicit_id = None;
    }

    fn handle_horizontal_rule(&mut self, range: std::ops::Range<usize>) {
        self.hr_count += 1;
        let id = format!("tf-hr-{}", self.hr_count);
        let line_start = self.find_line_start(range.start);
        
        if self.try_add_anchor(line_start, range.start, &id) {
            // Successfully added
        }
    }

    fn handle_start_tag(&mut self, tag: Tag, range: std::ops::Range<usize>) {
        if !is_block_level(&tag) {
            return;
        }

        // Skip list items and blockquotes
        if matches!(tag, Tag::Item | Tag::BlockQuote) {
            return;
        }

        // Handle code blocks
        if let Tag::CodeBlock(kind) = &tag {
            self.handle_code_block(kind, range);
            return;
        }

        // Handle images
        if let Tag::Image(_, dest, _) = &tag {
            self.handle_image(dest, range);
            return;
        }

        // Skip if inside table
        if self.table_depth > 0 {
            return;
        }

        // Skip blockquote/table lines
        let line_start = self.find_line_start(range.start);
        if self.is_special_line(line_start) {
            return;
        }

        // Add generic paragraph anchor
        let id = format!("tf-{}-{}", range.start, self.anchors.len());
        self.try_add_anchor(line_start, range.start, &id);
    }

    fn handle_code_block(&mut self, kind: &CodeBlockKind, range: std::ops::Range<usize>) {
        self.code_block_count += 1;
        let lang = match kind {
            CodeBlockKind::Fenced(lang) if !lang.is_empty() => {
                format!("-{}", lang.split_whitespace().next().unwrap_or(""))
            }
            _ => String::new(),
        };
        let id = format!("tf-code{}{}", lang, self.code_block_count);
        let line_start = self.find_line_start(range.start);
        self.try_add_anchor(line_start, range.start, &id);
    }

    fn handle_image(&mut self, dest: &str, range: std::ops::Range<usize>) {
        self.image_count += 1;
        let short_name: String = dest
            .rsplit('/')
            .next()
            .unwrap_or("")
            .split('.')
            .next()
            .unwrap_or("")
            .chars()
            .take(20)
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
            .collect();
            
        let id = if short_name.is_empty() {
            format!("tf-img-{}", self.image_count)
        } else {
            format!("tf-img-{}-{}", short_name, self.image_count)
        };
        
        let line_start = self.find_line_start(range.start);
        self.try_add_anchor(line_start, range.start, &id);
    }

    fn try_add_anchor(&mut self, insertion_offset: usize, source_offset: usize, id: &str) -> bool {
        if self.seen_offsets.contains(&insertion_offset) {
            return false;
        }
        
        self.seen_offsets.insert(insertion_offset);
        let (line, column) = offset_to_line_column(self.markdown, source_offset);
        let markup = build_anchor_markup(self.markdown, insertion_offset, id, false);
        self.insertions.push((insertion_offset, markup));
        self.anchors.push(AnchorMeta {
            id: id.to_string(),
            offset: source_offset,
            line,
            column,
        });
        true
    }

    fn find_line_start(&self, offset: usize) -> usize {
        let mut pos = offset;
        while pos > 0 && self.markdown.as_bytes()[pos - 1] != b'\n' {
            pos -= 1;
        }
        pos
    }

    fn find_line_end(&self, offset: usize) -> usize {
        let line_start = self.find_line_start(offset);
        let mut pos = line_start;
        while pos < self.markdown.len() && self.markdown.as_bytes()[pos] != b'\n' {
            pos += 1;
        }
        pos
    }

    fn is_special_line(&self, line_start: usize) -> bool {
        let line_text = &self.markdown[line_start..];
        let first_line = line_text.split('\n').next().unwrap_or("");
        let trimmed = first_line.trim_start();
        trimmed.starts_with('>') || trimmed.starts_with('|')
    }

    fn build_output(mut self, markdown: &str) -> Result<PreprocessorOutput> {
        self.insertions.sort_by_key(|(offset, _)| *offset);
        
        let mut output = markdown.to_owned();
        for (offset, snippet) in self.insertions.into_iter().rev() {
            output.insert_str(offset, &snippet);
        }

        Ok(PreprocessorOutput {
            markdown: output,
            anchors: self.anchors,
        })
    }
}

/// Build the Typst anchor markup string.
fn build_anchor_markup(source: &str, offset: usize, id: &str, inline: bool) -> String {
    let mut snippet = String::new();
    
    if offset > 0 && !inline && !source[..offset].ends_with('\n') {
        snippet.push('\n');
    }
    
    if inline {
        snippet.push(' ');
    }
    
    snippet.push_str("<!--raw-typst #label(\"");
    snippet.push_str(id);
    snippet.push_str("\") -->");
    
    if !inline {
        snippet.push('\n');
    }
    
    snippet
}

/// Check if a tag represents a block-level element.
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

/// Convert heading text to a URL-friendly slug (GitHub-style).
fn slugify(text: &str) -> String {
    let slug: String = text
        .chars()
        .map(|c| {
            if c.is_alphanumeric() {
                c.to_lowercase().to_string()
            } else if c.is_whitespace() || c == '-' || c == '/' || c == '\\' 
                    || c == '—' || c == '–' {
                "-".to_string()
            } else {
                String::new()
            }
        })
        .collect();

    // Collapse consecutive dashes
    let mut result = String::new();
    let mut prev_dash = false;
    for c in slug.chars() {
        if c == '-' {
            if !prev_dash {
                result.push(c);
                prev_dash = true;
            }
        } else {
            result.push(c);
            prev_dash = false;
        }
    }

    result.trim_matches('-').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("API Reference"), "api-reference");
        assert_eq!(slugify("What's New?"), "whats-new");
    }

    #[test]
    fn test_inject_anchors_basic() {
        let md = "# Hello\n\nWorld";
        let result = inject_anchors(md).unwrap();
        assert!(result.markdown.contains("tf-doc-start"));
        assert!(result.markdown.contains("#label(\"hello\")"));
    }
}
