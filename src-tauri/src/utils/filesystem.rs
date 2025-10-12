//! Filesystem utilities for copying directories and sanitizing filenames.

use anyhow::{Result, anyhow};
use regex::Regex;
use std::fs;
use std::path::Path;
use std::time::Duration;
use std::thread;

/// Copy a file with retry logic for transient failures
pub fn copy_file_with_retry(source: &Path, destination: &Path, max_retries: u32) -> Result<u64> {
    let mut attempts = 0;
    let mut last_error = None;
    
    while attempts < max_retries {
        match fs::copy(source, destination) {
            Ok(bytes) => return Ok(bytes),
            Err(e) => {
                attempts += 1;
                last_error = Some(e);
                
                if attempts < max_retries {
                    // Exponential backoff: 50ms, 100ms, 200ms
                    let delay = Duration::from_millis(50 * (1 << (attempts - 1)));
                    thread::sleep(delay);
                }
            }
        }
    }
    
    Err(anyhow!(
        "Failed to copy file after {} attempts: {}",
        max_retries,
        last_error.expect("BUG: last_error should be set after at least one attempt")
    ))
}

/// Copy directory contents with optional overwrite control.
/// 
/// If `force_overwrite` is true, existing files/directories at destination are removed first.
/// If false, only copies files that don't already exist at destination.
pub fn copy_directory(from: &Path, to: &Path, force_overwrite: bool) -> Result<()> {
    if !from.exists() {
        return Ok(());
    }
    
    // Prevent copying a directory into itself
    if from == to {
        return Ok(());
    }
    
    // If force overwrite and destination exists, remove it first
    if force_overwrite && to.exists() {
        fs::remove_dir_all(to)?;
    }
    
    // Create destination directory
    if !to.exists() {
        fs::create_dir_all(to)?;
    }
    
    // Copy all entries
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let source = entry.path();
        let destination = to.join(entry.file_name());
        
        if file_type.is_dir() {
            copy_directory(&source, &destination, force_overwrite)?;
        } else if force_overwrite || !destination.exists() {
            // Use retry logic for file copy operations (3 attempts)
            copy_file_with_retry(&source, &destination, 3)?;
        }
    }
    
    Ok(())
}

/// Sanitize filename to be safe for file systems
pub fn sanitize_filename(filename: &str) -> String {
    // Remove any potentially dangerous characters
    let re = Regex::new(r"[^a-zA-Z0-9\-_.]+")
        .expect("BUG: Invalid regex pattern for filename sanitization");
    let sanitized = re.replace_all(filename, "-").to_string();
    
    // Ensure the filename is not empty
    if sanitized.is_empty() {
        return "file.txt".to_string();
    }
    
    sanitized
}
