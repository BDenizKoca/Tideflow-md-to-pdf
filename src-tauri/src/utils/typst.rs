//! Typst-specific utilities for image path rewriting in Markdown.

use crate::utils::filesystem::sanitize_filename;
use regex::Regex;
use std::borrow::Cow;
use std::path::{Path, PathBuf};

/// Rewrite image sources in Markdown and HTML to absolute, normalized paths.
/// This helps Typst resolve images when we compile from a different working directory.
///
/// Rules:
/// - Skip http(s), data:, and file: URIs
/// - Resolve relative paths against `base_dir`
/// - Normalize Windows paths to use forward slashes
/// - If a path contains spaces or parentheses, wrap in angle brackets in Markdown form
pub fn rewrite_image_paths_in_markdown(
    input: &str, 
    base_dir: &Path, 
    assets_root: Option<&Path>
) -> String {
    // Helper to decide if a path is a URL-like that we should not touch
    fn is_external(p: &str) -> bool {
        let lower = p.to_ascii_lowercase();
        lower.starts_with("http://") 
            || lower.starts_with("https://") 
            || lower.starts_with("data:") 
            || lower.starts_with("file:")
    }

    // Normalize a file path to absolute with forward slashes.
    fn absolute_norm<'a>(
        base: &'a Path, 
        raw: &'a str, 
        assets_root: Option<&'a Path>, 
        wrap_for_markdown: bool
    ) -> Cow<'a, str> {
        if is_external(raw) {
            return Cow::Borrowed(raw);
        }

        // Handle angle-bracket wrapped markdown paths like <path with spaces>
        let trimmed = raw.trim();
        let (unwrapped, had_angle) = if trimmed.starts_with('<') && trimmed.ends_with('>') {
            (&trimmed[1..trimmed.len() - 1], true)
        } else { 
            (trimmed, false) 
        };

        // Normalize input to forward slashes
        let normalized_unwrapped = unwrapped.replace('\\', "/");

        // If path starts with assets/, emit root-relative /assets/... so Typst resolves from --root
        if normalized_unwrapped.starts_with("assets/") || normalized_unwrapped == "assets" {
            let mut root_rel = format!("/{}", normalized_unwrapped.trim_start_matches('/'));
            
            // Re-wrap for markdown if needed
            if wrap_for_markdown && (had_angle || root_rel.contains(' ') || root_rel.contains('(') || root_rel.contains(')')) {
                root_rel = format!("<{}>", root_rel);
            }
            
            return Cow::Owned(root_rel);
        }

        // Compute content root from assets_root (its parent)
        let content_root_opt: Option<&Path> = assets_root.and_then(|p| p.parent());

        // Detect Windows absolute (e.g., C:\ or C:/) or POSIX absolute starting with /
        let is_abs = Path::new(unwrapped).is_absolute()
            || unwrapped.chars().nth(1) == Some(':');

        // Join relative paths against base; keep absolutes as-is
        let joined = if is_abs { 
            PathBuf::from(&normalized_unwrapped) 
        } else { 
            base.join(&normalized_unwrapped) 
        };

        // Try canonicalize to collapse .. segments; fall back if it fails
        let abs = joined.canonicalize().unwrap_or(joined);

        // Convert to forward slashes and strip UNC verbatim prefix
        let mut path_str = abs.to_string_lossy().replace('\\', "/");
        if path_str.starts_with("//?/") { 
            path_str = path_str.trim_start_matches("//?/").to_string(); 
        }

        // If inside content root, convert to root-relative with leading '/'
        if let Some(content_root) = content_root_opt {
            let mut content_root_str = content_root.to_string_lossy().replace('\\', "/");
            if content_root_str.ends_with('/') { 
                content_root_str.pop(); 
            }
            
            if path_str.starts_with(&content_root_str) {
                let mut rel = path_str[content_root_str.len()..].to_string();
                if !rel.starts_with('/') { 
                    rel = format!("/{}", rel); 
                }
                
                // Ensure markdown wrapping if needed
                if wrap_for_markdown && (had_angle || rel.contains(' ') || rel.contains('(') || rel.contains(')')) {
                    rel = format!("<{}>", rel);
                }
                
                return Cow::Owned(rel);
            }
        }

        // Fallback: leave as absolute OS path (may be blocked by --root if outside)
        // If assets_root is provided and the file is outside the content root,
        // copy it into the assets folder and return a root-relative /assets/... path
        if let Some(assets_dir) = assets_root {
            // Attempt to copy file into assets_dir
            if let Some(fname_os) = abs.file_name() {
                let sanitized = sanitize_filename(&fname_os.to_string_lossy());
                
                // Limit filename length to avoid Windows MAX_PATH (260 char) issues
                // Long filenames can cause OS error 123: "invalid filename syntax"
                // Truncate to 100 chars for stem, use hash for uniqueness
                let path_obj = std::path::Path::new(&sanitized);
                let stem = path_obj.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("file");
                let ext = path_obj.extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("");
                
                // Truncate stem if too long (max 100 chars)
                let truncated_stem = if stem.len() > 100 {
                    &stem[0..100]
                } else {
                    stem
                };
                
                let mut fname = if ext.is_empty() {
                    truncated_stem.to_string()
                } else {
                    format!("{}.{}", truncated_stem, ext)
                };
                
                let mut dest = assets_dir.join(&fname);
                
                // If file exists, use a short hash instead of incrementing counter
                if dest.exists() {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    
                    let mut hasher = DefaultHasher::new();
                    abs.hash(&mut hasher);
                    let hash = hasher.finish();
                    let hash_str = format!("{:x}", hash);
                    let hash_short = &hash_str[0..8.min(hash_str.len())];
                    
                    fname = if ext.is_empty() {
                        format!("{}-{}", truncated_stem, hash_short)
                    } else {
                        format!("{}-{}.{}", truncated_stem, hash_short, ext)
                    };
                    
                    dest = assets_dir.join(&fname);
                }
                
                if std::fs::copy(&abs, &dest).is_ok() {
                    // Construct root-relative path for Typst (--root points at content_dir)
                    let mut rel = format!("/assets/{}", fname);
                    
                    if wrap_for_markdown && (had_angle || rel.contains(' ') || rel.contains('(') || rel.contains(')')) {
                        rel = format!("<{}>", rel);
                    }
                    
                    return Cow::Owned(rel);
                }
                // If copy fails, fall through to returning absolute path
            }
        }

        // Re-wrap if original had angle brackets, or add if spaces/parens present
        if wrap_for_markdown {
            if had_angle || path_str.contains(' ') || path_str.contains('(') || path_str.contains(')') {
                path_str = format!("<{}>", path_str);
            }
        }
        
        Cow::Owned(path_str)
    }

    // Replace Markdown image syntax: ![alt](path "title")
    // We'll conservatively capture inside the parentheses and split off a title if present.
    let re_md_img = Regex::new(r"!\[[^\]]*\]\(([^)]+)\)")
        .expect("BUG: Invalid regex pattern for markdown images");
    let result = re_md_img.replace_all(input, |caps: &regex::Captures| {
        let inside = caps.get(1).map(|m| m.as_str()).unwrap_or("").trim();
        
        // Extract path and optional title: path [whitespace title]
        let mut path_part = inside;
        let mut title_part: Option<&str> = None;
        
        // Handle quoted title variants
        let mut in_quotes = false;
        let mut split_idx: Option<usize> = None;
        
        for (i, ch) in inside.char_indices() {
            match ch {
                '"' => in_quotes = !in_quotes,
                ' ' | '\t' if !in_quotes => { 
                    split_idx = Some(i); 
                    break; 
                }
                _ => {}
            }
        }
        
        if let Some(idx) = split_idx {
            path_part = inside[..idx].trim();
            title_part = Some(inside[idx..].trim());
        }
        
        let abs = absolute_norm(base_dir, path_part, assets_root, true);
        
        if let Some(title) = title_part {
            format!("![]({} {})", abs, title)
        } else {
            format!("![]({})", abs)
        }
    });

    // Replace HTML <img ... src="..."> occurrences
    let re_html_img = Regex::new(r#"<img([^>]*?)\s+src=([\"'])([^\"']+)([\"'])([^>]*)>"#)
        .expect("BUG: Invalid regex pattern for HTML images");
    let result = re_html_img.replace_all(&result, |caps: &regex::Captures| {
        let before = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let quote = caps.get(2).map(|m| m.as_str()).unwrap_or("\"");
        let src = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        let after_quote = caps.get(4).map(|m| m.as_str()).unwrap_or("\"");
        let after = caps.get(5).map(|m| m.as_str()).unwrap_or("");
        
        let abs = absolute_norm(base_dir, src, assets_root, false);
        
        format!("<img{} src={}{}{}{}>", before, quote, abs, after_quote, after)
    });

    // Replace raw Typst calls: #fig("path" ...) and #image('path' ...)
    let re_raw_typst = Regex::new(r#"#(fig|image)\(\s*([\"'])([^\"']+)([\"'])"#)
        .expect("BUG: Invalid regex pattern for raw Typst calls");
    let result = re_raw_typst.replace_all(&result, |caps: &regex::Captures| {
        let func = caps.get(1).map(|m| m.as_str()).unwrap_or("fig");
        let quote = caps.get(2).map(|m| m.as_str()).unwrap_or("\"");
        let path = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        
        let abs = absolute_norm(base_dir, path, assets_root, false);
        
        format!("#{}({}{}{}", func, quote, abs, quote)
    });

    result.into_owned()
}

