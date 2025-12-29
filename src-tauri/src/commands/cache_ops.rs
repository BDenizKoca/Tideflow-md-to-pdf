/// Cache operation commands: manage render cache and temporary files
use crate::log_debug;
use crate::utils;
use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};
use tauri::AppHandle;

#[derive(Debug, Serialize)]
pub struct CacheStats {
    pub cached_documents: usize,
    pub cache_size_mb: f64,
    pub cache_hits: usize,
    pub cache_misses: usize,
}

#[derive(Debug, Serialize)]
pub struct CleanupResponse {
    pub files_removed: usize,
    pub total_space_freed: u64,
}

/// Get render cache statistics
#[tauri::command]
pub async fn get_cache_stats(app_handle: AppHandle) -> Result<CacheStats, String> {
    let content_dir = utils::get_content_dir(&app_handle)
        .map_err(|e| format!("Failed to get content directory: {}", e))?;
    let build_dir = content_dir.join(".build");
    
    let mut cached_documents = 0;
    let mut cache_size_mb = 0.0;
    
    if build_dir.exists() {
        if let Ok(entries) = fs::read_dir(&build_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name.starts_with("cached_"))
                    .unwrap_or(false) {
                    cached_documents += 1;
                    if let Ok(metadata) = fs::metadata(&path) {
                        cache_size_mb += metadata.len() as f64 / (1024.0 * 1024.0);
                    }
                }
            }
        }
    }
    
    Ok(CacheStats {
        cached_documents,
        cache_size_mb,
        cache_hits: 0, // Basic cache - no hit/miss tracking for now
        cache_misses: 0,
    })
}

/// Clear render cache
#[tauri::command]
pub async fn clear_render_cache(app_handle: AppHandle) -> Result<(), String> {
    let content_dir = utils::get_content_dir(&app_handle)
        .map_err(|e| format!("Failed to get content directory: {}", e))?;
    let build_dir = content_dir.join(".build");
    
    if build_dir.exists() {
        if let Ok(entries) = fs::read_dir(&build_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name.starts_with("cached_"))
                    .unwrap_or(false) {
                    let _ = fs::remove_file(&path);
                }
            }
        }
    }
    
    log_debug!("cache", "Render cache cleared");
    Ok(())
}

/// Cleanup temporary PDF files based on age and count
#[tauri::command]
pub async fn cleanup_temp_pdfs(app_handle: AppHandle, keep_last_n: Option<usize>) -> Result<CleanupResponse, String> {
    let keep_count = keep_last_n.unwrap_or(10); // Default to keeping last 10 files
    let max_age = Duration::from_secs(30 * 60); // 30 minutes
    
    let content_dir = utils::get_content_dir(&app_handle).map_err(|e| e.to_string())?;
    let build_dir = content_dir.join(".build");
    
    if !build_dir.exists() {
        return Ok(CleanupResponse {
            files_removed: 0,
            total_space_freed: 0,
        });
    }
    
    let mut temp_pdfs = Vec::new();
    
    // Find all temp_*.pdf files
    if let Ok(entries) = fs::read_dir(&build_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("temp_") && name.ends_with(".pdf") {
                    if let Ok(metadata) = entry.metadata() {
                        temp_pdfs.push((path, metadata));
                    }
                }
            }
        }
    }
    
    // Sort by modification time (newest first)
    temp_pdfs.sort_by_key(|(_, metadata)| {
        metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH)
    });
    temp_pdfs.reverse(); // Newest first
    
    let mut files_removed = 0;
    let mut total_space_freed = 0;
    let now = SystemTime::now();
    
    // Remove files beyond keep_count or older than max_age
    for (i, (path, metadata)) in temp_pdfs.iter().enumerate() {
        let should_remove = if i >= keep_count {
            true // Beyond keep count
        } else if let Ok(age) = now.duration_since(metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH)) {
            age > max_age // Too old
        } else {
            false
        };
        
        if should_remove {
            total_space_freed += metadata.len();
            if fs::remove_file(path).is_ok() {
                files_removed += 1;
            }
        }
    }
    
    Ok(CleanupResponse {
        files_removed,
        total_space_freed,
    })
}

/// Cleanup unused assets (images) that are not referenced in any markdown file.
/// Scans all .md files in the content directory and removes orphaned assets.
#[tauri::command]
pub async fn cleanup_unused_assets(app_handle: AppHandle) -> Result<CleanupResponse, String> {
    let content_dir = utils::get_content_dir(&app_handle).map_err(|e| e.to_string())?;
    let assets_dir = utils::get_assets_dir(&app_handle).map_err(|e| e.to_string())?;

    if !assets_dir.exists() {
        return Ok(CleanupResponse {
            files_removed: 0,
            total_space_freed: 0,
        });
    }

    // Step 1: Find all referenced assets by scanning markdown files
    let mut referenced_assets = HashSet::new();

    fn scan_directory_for_markdown(dir: &PathBuf, referenced: &mut HashSet<String>) -> std::io::Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            // Skip .build directory
            if let Some(name) = path.file_name() {
                if name == ".build" {
                    continue;
                }
            }

            if path.is_dir() {
                scan_directory_for_markdown(&path, referenced)?;
            } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
                // Read markdown file and find asset references
                if let Ok(content) = fs::read_to_string(&path) {
                    // Look for assets/ references in markdown (both img tags and markdown syntax)
                    // Pattern: assets/filename.ext or "assets/filename.ext"
                    for line in content.lines() {
                        if line.contains("assets/") {
                            // Extract all "assets/..." patterns
                            for word in line.split_whitespace() {
                                if let Some(start) = word.find("assets/") {
                                    let asset_path = &word[start..];
                                    // Clean up quotes, parentheses, etc.
                                    let cleaned = asset_path
                                        .trim_end_matches(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_' && c != '/')
                                        .trim_start_matches(|c: char| !c.is_alphanumeric() && c != '/')
                                        .replace("assets/", "");
                                    if !cleaned.is_empty() {
                                        referenced.insert(cleaned);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    let _ = scan_directory_for_markdown(&content_dir, &mut referenced_assets);

    // Step 2: Find all actual assets in the assets directory
    let mut files_removed = 0;
    let mut total_space_freed = 0;

    if let Ok(entries) = fs::read_dir(&assets_dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_file() {
                if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                    // If this asset is not referenced in any markdown file, remove it
                    if !referenced_assets.contains(filename) {
                        if let Ok(metadata) = fs::metadata(&path) {
                            total_space_freed += metadata.len();
                        }
                        if fs::remove_file(&path).is_ok() {
                            files_removed += 1;
                            log_debug!("assets", "Removed unused asset: {}", filename);
                        }
                    }
                }
            }
        }
    }

    log_debug!("assets", "Cleanup complete: {} files removed, {} bytes freed", files_removed, total_space_freed);

    Ok(CleanupResponse {
        files_removed,
        total_space_freed,
    })
}

/// Clear bibliography files from .build directory.
/// Called when user clicks the clear (X) button on bibliography settings.
#[tauri::command]
pub async fn clear_bibliography(app_handle: AppHandle) -> Result<(), String> {
    let content_dir = utils::get_content_dir(&app_handle).map_err(|e| e.to_string())?;
    let build_dir = content_dir.join(".build");

    if !build_dir.exists() {
        return Ok(());
    }

    // Remove all bibliography files
    if let Ok(entries) = fs::read_dir(&build_dir) {
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension() {
                if ext == "bib" || ext == "yml" || ext == "yaml" {
                    let _ = fs::remove_file(entry.path());
                    log_debug!("bibliography", "Removed bibliography file: {:?}", entry.path());
                }
            }
        }
    }

    Ok(())
}
