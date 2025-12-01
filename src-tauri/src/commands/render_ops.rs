/// Rendering operation commands: compile markdown/typst to PDF
use crate::renderer::{self, RenderedDocument};
use crate::image_export;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn render_markdown(
    app_handle: AppHandle,
    file_path: &str,
) -> Result<RenderedDocument, String> {
    match renderer::render_markdown(&app_handle, file_path).await {
        Ok(document) => {
            let _ = app_handle.emit("compiled", &document);
            Ok(document)
        }
        Err(e) => {
            let _ = app_handle.emit("compile-error", e.to_string());
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn export_markdown(
    app_handle: AppHandle,
    file_path: &str,
) -> Result<String, String> {
    match renderer::export_markdown(&app_handle, file_path).await {
        Ok(pdf_path) => {
            // Emit the exported event with the PDF path
            let _ = app_handle.emit("exported", &pdf_path);
            Ok(pdf_path)
        }
        Err(e) => {
            // Emit export error event
            let _ = app_handle.emit("export-error", e.to_string());
            Err(e.to_string())
        }
    }
}

/// Save (copy) an existing PDF (already rendered/exported) to a user-selected destination.
/// If the source is a markdown path, we compile first to ensure it's up to date, then copy.
#[tauri::command]
pub async fn save_pdf_as(
    app_handle: AppHandle,
    file_path: &str,
    destination: &str,
) -> Result<String, String> {
    let src_path = Path::new(file_path);
    let dest_path = Path::new(destination);

    // If user passed a markdown file, ensure export first
    let ext = src_path.extension().and_then(|e| e.to_str()).unwrap_or("");
    let mut pdf_source: PathBuf = src_path.to_path_buf();

    if ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("qmd") {
        // Export (compile) to sibling PDF, then copy that
        match renderer::export_markdown(&app_handle, file_path).await {
            Ok(p) => pdf_source = PathBuf::from(p),
            Err(e) => return Err(e.to_string()),
        }
    } else if ext.eq_ignore_ascii_case("pdf") {
        // Using PDF directly
    } else {
        return Err("Unsupported source file type for save_pdf_as".into());
    }

    if !pdf_source.exists() {
        return Err(format!("Source PDF does not exist: {}", pdf_source.display()));
    }

    // Ensure destination directory exists
    if let Some(parent) = dest_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) { return Err(e.to_string()); }
    }

    fs::copy(&pdf_source, dest_path).map_err(|e| e.to_string())?;
    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn render_typst(
    app_handle: AppHandle,
    content: &str,
    format: &str,
    current_file: Option<&str>,
) -> Result<RenderedDocument, String> {
    match renderer::render_typst(&app_handle, content, format, current_file).await {
        Ok(document) => {
            let _ = app_handle.emit("compiled", &document);
            Ok(document)
        }
        Err(e) => {
            let _ = app_handle.emit("compile-error", e.to_string());
            Err(e.to_string())
        }
    }
}

/// Export the current document as PNG
#[tauri::command]
pub async fn export_as_png(
    app_handle: AppHandle,
    content: &str,
    destination: &str,
    ppi: Option<u32>,
    current_file: Option<&str>,
) -> Result<String, String> {
    image_export::export_as_image(&app_handle, content, destination, "png", ppi, current_file)
        .await
        .map_err(|e| e.to_string())
}

/// Export the current document as SVG
#[tauri::command]
pub async fn export_as_svg(
    app_handle: AppHandle,
    content: &str,
    destination: &str,
    current_file: Option<&str>,
) -> Result<String, String> {
    image_export::export_as_image(&app_handle, content, destination, "svg", None, current_file)
        .await
        .map_err(|e| e.to_string())
}
