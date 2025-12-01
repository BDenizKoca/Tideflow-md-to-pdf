//! Image export functionality (PNG/SVG) - Pro version exclusive
//!
//! This module provides functions to export Typst documents to image formats.
//! Separated from the main renderer to simplify merging with Free version.

use crate::preprocessor::preprocess_markdown;
use crate::render_pipeline::{self, RenderConfig};
use crate::utils;
use anyhow::{anyhow, Context, Result};
use std::fs;
use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

// Reuse the render mutex from renderer to prevent concurrent operations
lazy_static::lazy_static! {
    static ref IMAGE_EXPORT_MUTEX: Arc<Mutex<()>> = Arc::new(Mutex::new(()));
}

/// Export markdown to PNG or SVG using Typst
///
/// This function compiles the markdown to the specified image format.
/// For PNG, you can optionally specify PPI (pixels per inch) for resolution.
/// For SVG, the output is vector-based and resolution-independent.
///
/// Multi-page documents will create separate numbered files (e.g., doc-1.png, doc-2.png)
pub async fn export_as_image(
    app_handle: &AppHandle,
    content: &str,
    destination: &str,
    format: &str, // "png" or "svg"
    ppi: Option<u32>, // Only used for PNG, default is 144
    current_file: Option<&str>, // Optional file path for asset resolution
) -> Result<String> {
    // Validate format
    if format != "png" && format != "svg" {
        return Err(anyhow!("Unsupported format: {}. Use 'png' or 'svg'", format));
    }

    // Acquire lock to prevent multiple simultaneous exports
    let _lock = IMAGE_EXPORT_MUTEX.lock().await;

    // Setup directories
    let content_dir = utils::get_content_dir(app_handle)?;
    let build_dir = content_dir.join(".build");
    fs::create_dir_all(&build_dir)?;

    // Setup render configuration
    let config = RenderConfig {
        app_handle,
        build_dir: build_dir.clone(),
        content_dir: content_dir.clone(),
        typst_root: content_dir.clone(),
    };

    // Setup preferences
    render_pipeline::setup_prefs(&config, &format!("markdown-export-{}", format))?;

    // Preprocess markdown content
    let base_dir = if let Some(file_path) = current_file {
        Path::new(file_path).parent().unwrap_or(Path::new("."))
    } else {
        Path::new(".")
    };

    let assets_root = utils::get_assets_dir(app_handle).ok();
    let assets_root_ref = assets_root.as_deref();
    let preprocess = preprocess_markdown(content)?;
    let md_content =
        utils::rewrite_image_paths_in_markdown(&preprocess.markdown, base_dir, assets_root_ref);
    fs::write(build_dir.join("content.md"), md_content)?;

    // Setup template
    render_pipeline::setup_template(&config, &format!("markdown-export-{}", format))?;

    // Get Typst binary path
    let typst_path = utils::get_typst_path(app_handle)
        .context("Typst binary not found. Please install Typst system-wide or download and place in bin/typst/<platform>/ directory.")?;

    // Compile to image format
    let output_path = Path::new(destination);

    // For PNG/SVG, Typst requires a page number template if there are multiple pages
    // We'll add {p} to the filename (e.g., document-{p}.png becomes document-1.png, document-2.png, etc.)
    let output_name = {
        // Get the base name without extension
        let file_stem = output_path.file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| anyhow!("Invalid output filename"))?;
        let parent = output_path.parent().unwrap_or(Path::new(""));

        // Create a path with {p} template for multi-page export
        let ext = if format == "png" { "png" } else { "svg" };
        let template_name = format!("{}-{{p}}.{}", file_stem, ext);
        parent.join(&template_name).to_string_lossy().to_string()
    };

    // Build Typst compile command with format-specific arguments
    let mut command = render_pipeline::typst_command(&typst_path);
    command.current_dir(&build_dir);
    command.args([
        "compile",
        "--root",
        config.typst_root.to_string_lossy().as_ref(),
    ]);

    // Add format-specific flags
    match format {
        "png" => {
            let ppi_value = ppi.unwrap_or(144); // Default 144 PPI for good quality
            command.arg("--format").arg("png");
            command.arg("--ppi").arg(ppi_value.to_string());
        }
        "svg" => {
            command.arg("--format").arg("svg");
        }
        _ => unreachable!("Format already validated"),
    }

    command.args([
        "tideflow.typ",
        &output_name,
    ]);

    // Set package path if needed
    if let Some(package_env) = render_pipeline::typst_package_env(&config) {
        command.env("TYPST_PACKAGE_PATH", package_env);
    }

    // Execute command
    let output = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(anyhow!(
            "Typst {} export failed.\nSTDOUT:\n{}\nSTDERR:\n{}",
            format.to_uppercase(),
            stdout.trim(),
            stderr.trim()
        ));
    }

    // For multi-page documents, Typst creates files like document-1.png, document-2.png, etc.
    // Return the base path (the user's requested destination) as a success indicator
    // The actual files will have page numbers appended
    let result_path = output_path.to_string_lossy().to_string();

    // Emit success event
    app_handle.emit(&format!("exported-{}", format), result_path.clone()).ok();

    Ok(result_path)
}
