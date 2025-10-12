//! Application initialization utilities for setting up directories and default files.

use crate::utils::{filesystem, paths};
use anyhow::{anyhow, Result};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Initialize app directories
pub fn initialize_app_directories(app_handle: &AppHandle) -> Result<()> {
    // Create content directory and subdirectories
    let content_dir = paths::get_content_dir(app_handle)?;
    let assets_dir = content_dir.join("assets");
    let build_dir = content_dir.join(".build");
    
    fs::create_dir_all(&content_dir)?;
    fs::create_dir_all(&assets_dir)?;
    fs::create_dir_all(&build_dir)?;
    
    // Create templates directory
    let templates_dir = paths::get_templates_dir(app_handle)?;
    fs::create_dir_all(&templates_dir)?;
    
    // Create styles directory
    let styles_dir = paths::get_styles_dir(app_handle)?;
    fs::create_dir_all(&styles_dir)?;
    
    // Copy template files if they don't exist
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| anyhow!("Failed to get resource directory: {}", e))?;
    let app_templates_dir = resource_dir.join("templates");
    
    if app_templates_dir.exists() {
        filesystem::copy_directory(&app_templates_dir, &templates_dir, false)?;
    }
    
    // Copy Typst template(s) from resources/content to user content dir, updating if different
    ensure_tideflow_template_exists(app_handle)?;
    
    // Copy all .typ style files from resources/styles to user styles dir if missing
    copy_style_files(&resource_dir, &styles_dir)?;
    
    // Create default prefs.json if it doesn't exist
    create_default_config_files(app_handle)?;
    
    Ok(())
}

/// Ensure the tideflow.typ template exists in the user content directory, copying it from resources if needed.
pub fn ensure_tideflow_template_exists(app_handle: &AppHandle) -> Result<PathBuf> {
    let content_dir = paths::get_content_dir(app_handle)?;
    fs::create_dir_all(&content_dir)?;

    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| anyhow!("Failed to get resource directory: {}", e))?;

    copy_tideflow_template(app_handle, &resource_dir, &content_dir)?;

    Ok(content_dir.join("tideflow.typ"))
}

/// Copy tideflow.typ template and themes from resources to user content directory
fn copy_tideflow_template(
    _app_handle: &AppHandle,
    resource_dir: &PathBuf,
    content_dir: &PathBuf,
) -> Result<()> {
    let user_typst_template = content_dir.join("tideflow.typ");
    
    println!("🔍 Looking for tideflow.typ template...");
    
    // Try different possible locations for the template
    let mut template_sources = Vec::new();
    let mut used_template_source: Option<PathBuf> = None;

    // 1. Try resource directory (for production builds)
    let resource_content_dir = resource_dir.join("content");
    template_sources.push(resource_content_dir.join("tideflow.typ"));

    // 2. Try relative to current directory (for development)
    if let Ok(current_dir) = std::env::current_dir() {
        template_sources.push(current_dir.join("src-tauri").join("content").join("tideflow.typ"));
        template_sources.push(current_dir.join("content").join("tideflow.typ"));
    }

    // 3. Try relative to executable directory
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            template_sources.push(exe_dir.join("content").join("tideflow.typ"));
            template_sources.push(exe_dir.join("..").join("content").join("tideflow.typ"));
        }
    }

    let mut copied = false;

    for src in &template_sources {
        println!("🔎 Checking template source: {}", src.display());

        if src.exists() {
            // Check if we need to copy/update the template
            let should_copy = if !user_typst_template.exists() {
                println!("📝 Template doesn't exist, will copy");
                true
            } else {
                match (fs::read_to_string(src), fs::read_to_string(&user_typst_template)) {
                    (Ok(src_content), Ok(dst_content)) => {
                        if src_content != dst_content {
                            println!("🔄 Template content differs, will update");
                            true
                        } else {
                            println!("✅ Template is up to date");
                            false
                        }
                    }
                    _ => {
                        println!("⚠️ Could not compare templates, will copy");
                        true
                    }
                }
            };

            if should_copy {
                match fs::copy(src, &user_typst_template) {
                    Ok(_) => {
                        println!("✅ Copied tideflow.typ from {} to {}", src.display(), user_typst_template.display());
                        used_template_source = Some(src.clone());
                        copied = true;
                        break;
                    }
                    Err(e) => {
                        println!("❌ Failed to copy template from {}: {}", src.display(), e);
                    }
                }
            } else {
                used_template_source = Some(src.clone());
                copied = true; // Don't need to copy, but mark as successful
                break;
            }
        }
    }

    // Copy themes directory if template source was found
    if let Some(template_path) = used_template_source {
        if let Some(template_dir) = template_path.parent() {
            let themes_src = template_dir.join("themes");
            let themes_dest = content_dir.join("themes");

            if themes_src.exists() && themes_src != themes_dest {
                filesystem::copy_directory(&themes_src, &themes_dest, true)?;
            }
        }
    }

    if !copied {
        println!("⚠️ Could not find tideflow.typ template in any location. Searched:");
        for src in &template_sources {
            println!("   - {}", src.display());
        }
    }
    
    Ok(())
}

/// Copy style files from resources to user styles directory
fn copy_style_files(resource_dir: &PathBuf, styles_dir: &PathBuf) -> Result<()> {
    let resource_styles_dir = resource_dir.join("styles");
    
    if resource_styles_dir.exists() {
        for entry in fs::read_dir(&resource_styles_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map(|e| e == "typ").unwrap_or(false) {
                let file_name = path.file_name()
                    .ok_or_else(|| anyhow!("Failed to get filename from path: {}", path.display()))?;
                let dest = styles_dir.join(file_name);
                
                if !dest.exists() {
                    fs::copy(&path, &dest)?;
                    println!("📄 Copied style {} to {}", file_name.to_string_lossy(), dest.display());
                }
            }
        }
    }
    
    Ok(())
}

/// Create default configuration files
fn create_default_config_files(app_handle: &AppHandle) -> Result<()> {
    let content_dir = paths::get_content_dir(app_handle)?;
    let legacy_path = content_dir.join("_prefs.json");
    let prefs_json_path = content_dir.join("prefs.json");
    
    // Migrate legacy file if present and new one missing
    if legacy_path.exists() && !prefs_json_path.exists() {
        if let Err(e) = std::fs::copy(&legacy_path, &prefs_json_path) {
            println!("⚠️ Failed to migrate legacy _prefs.json: {}", e);
        } else {
            println!("✅ Migrated legacy _prefs.json to prefs.json");
        }
    }
    
    // Create default prefs.json if it doesn't exist
    if !prefs_json_path.exists() {
        let default_prefs_json = r#"{
  "theme_id": "default",
  "papersize": "a4",
  "margin": {
    "x": "2cm",
    "y": "2.5cm"
  },
  "toc": false,
  "numberSections": true,
  "default_image_width": "80%",
  "default_image_alignment": "center",
  "fonts": {
    "main": "New Computer Modern",
    "mono": "Liberation Mono"
  },
  "render_debounce_ms": 400,
  "focused_preview_enabled": true,
  "preserve_scroll_position": true
}"#;
        fs::write(prefs_json_path, default_prefs_json)?;
    }
    
    Ok(())
}
