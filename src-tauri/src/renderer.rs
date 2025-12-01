use crate::preprocessor::{
    attach_pdf_positions, pdf_positions_from_query, preprocess_markdown, AnchorMeta, PdfPosition,
    SourceMapPayload,
};
use crate::render_pipeline::{self, RenderConfig};
use crate::utils;
use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

#[derive(Debug, Serialize)]
pub struct RenderedDocument {
    pub pdf_path: String,
    pub source_map: SourceMapPayload,
}

// A global mutex to ensure only one render happens at a time
lazy_static::lazy_static! {
    static ref RENDER_MUTEX: Arc<Mutex<()>> = Arc::new(Mutex::new(()));
}

// Map of file paths to last modification time to avoid duplicate renders
lazy_static::lazy_static! {
    static ref LAST_RENDER_TIMES: Arc<Mutex<std::collections::HashMap<String, SystemTime>>> =
        Arc::new(Mutex::new(std::collections::HashMap::new()));
}

fn build_source_map(
    app_handle: &AppHandle,
    typst_path: &Path,
    build_dir: &Path,
    content_dir: &Path,
    anchors: &[AnchorMeta],
) -> SourceMapPayload {
    if anchors.is_empty() {
        return SourceMapPayload::default();
    }

    let mut pdf_lookup: HashMap<String, PdfPosition> = HashMap::new();
    let root_arg = content_dir.to_string_lossy().to_string();
    let render_config = RenderConfig {
        app_handle,
        build_dir: build_dir.to_path_buf(),
        content_dir: content_dir.to_path_buf(),
        typst_root: content_dir.to_path_buf(),
    };
    let package_env = render_pipeline::typst_package_env(&render_config);
    // If the Typst binary is an older 0.13.x release, its `query` selector
    // syntax differs from newer releases and several selector variants we
    // might try here will fail with errors such as "unknown variable:
    // element". In that case prefer to emit a failure event so the
    // frontend can immediately fall back to PDF-text extraction rather
    // than repeatedly invoking `typst query` with incompatible selectors.
    //
    // We detect this by running `typst --version` and checking for
    // "0.13." in the output.
    let mut version_cmd = render_pipeline::typst_command(typst_path);
    if let Some(env) = package_env.as_ref() {
        version_cmd.env("TYPST_PACKAGE_PATH", env);
    }
    if let Ok(ver_out) = version_cmd.arg("--version").output() {
        if ver_out.status.success() {
            let ver_txt = String::from_utf8_lossy(&ver_out.stdout).to_string();
            if ver_txt.contains("0.13.") {
                // Only log once to avoid spam during development
                use std::sync::atomic::{AtomicBool, Ordering};
                static LOGGED_ONCE: AtomicBool = AtomicBool::new(false);
                if !LOGGED_ONCE.swap(true, Ordering::Relaxed) {
                    println!("[renderer] detected Typst version 0.13.x ({}); skipping typst query for all renders", ver_txt.trim());
                }
                let _ = app_handle.emit("typst-query-failed", "typst-0.13-incompatible");
                return attach_pdf_positions(anchors, &pdf_lookup);
            }
        }
    }

    // Try multiple selector variants to support different Typst versions.
    // Some Typst releases expect element-style selectors (e.g. element(label)).
    let selector_variants = ["label", "element(label)", "element('label')", "element(\"label\")", "element.label"];
    let mut tried_any = false;
    for selector in selector_variants.iter() {
        let args = [
            "query",
            "--format",
            "json",
            "--root",
            root_arg.as_str(),
            "tideflow.typ",
            selector,
        ];
        println!("[renderer] running typst query args: {:?}", args);
        let mut query_cmd = render_pipeline::typst_command(typst_path);
        if let Some(env) = package_env.as_ref() {
            query_cmd.env("TYPST_PACKAGE_PATH", env);
        }
        let query_result = query_cmd
            .current_dir(build_dir)
            .args(args)
            .output();

        tried_any = true;
        if let Ok(output) = query_result {
            // Sanitize selector for filename usage
            let sel_name: String = selector
                .chars()
                .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
                .collect();
            let stdout_txt = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr_txt = String::from_utf8_lossy(&output.stderr).to_string();
            let out_dump = build_dir.join(format!(".typst_query_output_{}.json", sel_name));
            let err_dump = build_dir.join(format!(".typst_query_error_{}.txt", sel_name));
            if let Err(e) = std::fs::write(&out_dump, stdout_txt.as_bytes()) {
                println!("[renderer] failed to write typst query stdout dump: {}", e);
            } else {
                println!("[renderer] typst query stdout written to: {}", out_dump.display());
            }
            // Emit stdout to the frontend for easier debugging in DevTools
            let _ = app_handle.emit("typst-query-stdout", stdout_txt.clone());
            if let Err(e) = std::fs::write(&err_dump, stderr_txt.as_bytes()) {
                println!("[renderer] failed to write typst query stderr dump: {}", e);
            } else {
                println!("[renderer] typst query stderr written to: {}", err_dump.display());
            }
            // Emit stderr to the frontend so the UI can show precise Typst errors
            let _ = app_handle.emit("typst-query-stderr", stderr_txt.clone());

            // If stderr indicates a selector-syntax incompatibility (common in
            // older Typst releases), stop trying additional selectors and
            // immediately notify the frontend so it can fall back to the
            // PDF-text extraction path. This avoids repeatedly invoking an
            // incompatible `typst query` and flooding the logs.
            if stderr_txt.contains("unknown variable: element") || stderr_txt.contains("only element functions can be used as selectors") {
                println!("[renderer] typst query stderr indicates incompatible selector syntax; emitting typst-query-failed and aborting selector loop");
                let _ = app_handle.emit("typst-query-failed", stderr_txt.clone());
                return attach_pdf_positions(anchors, &pdf_lookup);
            }

            if output.status.success() {
                if let Ok(map) = pdf_positions_from_query(&output.stdout) {
                    if !map.is_empty() {
                        pdf_lookup = map;
                        println!("[renderer] typst query succeeded with selector '{}' and produced {} positions", selector, pdf_lookup.len());
                        break;
                    } else {
                        println!("[renderer] typst query succeeded with selector '{}' but produced 0 positions", selector);
                        // try next selector
                    }
                } else {
                    println!("[renderer] typst query produced output but parser failed for selector '{}'", selector);
                }
            } else {
                println!("[renderer] typst query failed for selector '{}'; see stderr dump for details", selector);
                // try next selector
            }
        } else if let Err(e) = query_result {
            println!("[renderer] typst query invocation error for selector '{}': {:?}", selector, e);
            let inv_err = build_dir.join(format!(".typst_query_invocation_error_{}.txt", selector.chars().map(|c| if c.is_ascii_alphanumeric() { c } else { '_' }).collect::<String>()));
            if let Err(err) = std::fs::write(&inv_err, format!("{:?}", e).as_bytes()) {
                println!("[renderer] failed to write typst invocation error: {}", err);
            } else {
                println!("[renderer] typst invocation error written to: {}", inv_err.display());
            }
        }
    }
    if !tried_any {
        println!("[renderer] did not attempt any typst query selectors");
    }
    // If none of the selector attempts produced positions, emit an event so
    // the frontend can fall back to PDF-text extraction immediately.
    if pdf_lookup.is_empty() {
        // Emit an event so the frontend can fall back to PDF-text extraction.
        // Use the provided app_handle reference; emission failures are ignored.
        let _ = app_handle.emit("typst-query-failed", "no-positions-found");
    }

    attach_pdf_positions(anchors, &pdf_lookup)
}

/// Renders a Markdown file to PDF using Typst
pub async fn render_markdown(app_handle: &AppHandle, file_path: &str) -> Result<RenderedDocument> {
    let path = Path::new(file_path);

    // Only render markdown files
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if ext != "md" && ext != "qmd" {
        return Err(anyhow!("Not a markdown file: {}", file_path));
    }

    if !path.exists() {
        return Err(anyhow!("File does not exist: {}", file_path));
    }

    // Acquire render lock to prevent multiple simultaneous renders
    let _lock = RENDER_MUTEX.lock().await;

    // Check if file has been modified since last render
    let metadata = fs::metadata(file_path)?;
    let mod_time = metadata.modified()?;

    // NOTE: Removed optimization that skipped rendering when file timestamp unchanged.
    // Preferences can change without touching the markdown file; we still need a fresh render.
    let mut last_render_times = LAST_RENDER_TIMES.lock().await;

    // Use Typst to render for preview
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

    // Setup preferences (handles cover image rewriting and debug events)
    render_pipeline::setup_prefs(&config, "markdown")?;

    // 2) Copy the markdown content to build/content.md (with preprocessing + image path rewrites)
    // We write two files:
    // - content.md (clean, no preview-only tokens) used for export and canonical build state
    // - content.preview.md (preview-only, includes non-printing/preview tokens next to anchors)
    // During preview compilation we temporarily copy content.preview.md over content.md so the
    // template and Typst query can see the preview-only tokens. Export remains untouched.
    let md_content_raw = fs::read_to_string(path)?;
    let base_dir = path.parent().unwrap_or(Path::new("."));
    // Resolve assets/ paths to the global content/assets directory so images work from any doc folder
    let assets_root = utils::get_assets_dir(app_handle).ok();
    let assets_root_ref = assets_root.as_deref();

    // Clean (export) version: do NOT inject visible tokens
    let preprocess_clean = preprocess_markdown(&md_content_raw)?;
    let md_content_clean = utils::rewrite_image_paths_in_markdown(
        &preprocess_clean.markdown,
        base_dir,
        assets_root_ref,
    );
    fs::write(build_dir.join("content.md"), &md_content_clean)?;

    // Preview version: inject preview-only tokens (these will NOT be used for exports)
    let preprocess_preview = preprocess_markdown(&md_content_raw)?;
    let md_content_preview = utils::rewrite_image_paths_in_markdown(
        &preprocess_preview.markdown,
        base_dir,
        assets_root_ref,
    );
    fs::write(build_dir.join("content.preview.md"), &md_content_preview)?;
    // Also write debug copies into workspace for developer inspection
    if let Ok(cwd) = std::env::current_dir() {
        let dbg_dir = cwd.join("src-tauri").join("gen_debug");
        let _ = std::fs::create_dir_all(&dbg_dir);
        let _ = std::fs::write(dbg_dir.join("content.md"), &md_content_clean);
        let _ = std::fs::write(dbg_dir.join("content.preview.md"), &md_content_preview);
    }

    // Setup template (copies template and syncs theme assets)
    render_pipeline::setup_template(&config, "markdown")?;

    // 4) Get bundled Typst binary path
    let typst_path = utils::get_typst_path(app_handle)
        .context("Typst binary not found. Please install Typst system-wide or download and place in bin/typst/<platform>/ directory.")?;

    // Compile preview PDF
    // For preview, temporarily install the preview content into content.md so the
    // template and typst query see the preview-only tokens. We'll restore the clean
    // content.md after compilation.
    let preview_src = build_dir.join("content.preview.md");
    let content_md = build_dir.join("content.md");
    if preview_src.exists() {
        if let Err(e) = fs::copy(&preview_src, &content_md) {
            println!("[renderer] warning: failed to install preview content for compile: {}", e);
        }
    }

    render_pipeline::compile_typst(&config, &typst_path, "preview.pdf")?;
    let preview_pdf = build_dir.join("preview.pdf");

    // Restore the clean content.md so the build directory reflects canonical (export) content.
    if let Err(e) = fs::write(build_dir.join("content.md"), &md_content_clean) {
        println!(
            "[renderer] warning: failed to restore clean content.md after preview compile: {}",
            e
        );
    }

    // Update last render time
    last_render_times.insert(file_path.to_string(), mod_time);

    // Use the anchor list from the clean preprocess (anchors are identical between preview and clean)
    let source_map = build_source_map(app_handle, &typst_path, &build_dir, &content_dir, &preprocess_clean.anchors);
    let document = RenderedDocument {
        pdf_path: preview_pdf.to_string_lossy().to_string(),
        source_map,
    };

    Ok(document)
}

/// Export markdown to final PDF location using Typst
pub async fn export_markdown(app_handle: &AppHandle, file_path: &str) -> Result<String> {
    let path = Path::new(file_path);

    // Only export markdown files
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if ext != "md" && ext != "qmd" {
        return Err(anyhow!("Not a markdown file: {}", file_path));
    }

    if !path.exists() {
        return Err(anyhow!("File does not exist: {}", file_path));
    }

    // Acquire render lock to prevent multiple simultaneous renders
    let _lock = RENDER_MUTEX.lock().await;

    // Setup similar to preview, but write to final path next to source
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
    render_pipeline::setup_prefs(&config, "markdown-export")?;

    // 2) Copy the markdown content to build/content.md (with image path rewrites)
    let md_content_raw = fs::read_to_string(path)?;
    let base_dir = path.parent().unwrap_or(Path::new("."));
    let assets_root = utils::get_assets_dir(app_handle).ok();
    let assets_root_ref = assets_root.as_deref();
    // For export, do NOT inject visible tokens — output must be clean for users
    let preprocess = preprocess_markdown(&md_content_raw)?;
    let md_content =
        utils::rewrite_image_paths_in_markdown(&preprocess.markdown, base_dir, assets_root_ref);
    fs::write(build_dir.join("content.md"), md_content)?;

    // Setup template
    render_pipeline::setup_template(&config, "markdown-export")?;

    // Get bundled Typst binary path
    let typst_path = utils::get_typst_path(app_handle)
        .context("Typst binary not found. Please install Typst system-wide or download and place in bin/typst/<platform>/ directory.")?;

    // Compile to final PDF next to source file
    let final_pdf = Path::new(file_path).with_extension("pdf");
    let final_pdf_name = final_pdf.file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| anyhow!("Invalid output filename"))?;
    
    render_pipeline::compile_typst(&config, &typst_path, final_pdf_name)?;

    if !final_pdf.exists() {
        return Err(anyhow!("Export PDF not found at {}", final_pdf.display()));
    }

    // Emit absolute path of final PDF to UI
    app_handle.emit("exported", final_pdf.to_string_lossy().to_string()).ok();

    Ok(final_pdf.to_string_lossy().to_string())
}

/// Renders Typst content directly to PDF (always full render)
pub async fn render_typst(
    app_handle: &AppHandle,
    content: &str,
    _format: &str,
    current_file: Option<&str>,
) -> Result<RenderedDocument> {
    // Acquire render lock to prevent multiple simultaneous renders
    let _lock = RENDER_MUTEX.lock().await;

    // Get path to Typst binary (fail fast if missing)
    let typst_path = utils::get_typst_path(app_handle)
        .context("Typst binary not found. Please install Typst system-wide or download and place in bin/typst/<platform>/ directory.")?;

    // Create .build directory if it doesn't exist
    let content_dir = utils::get_content_dir(app_handle)?;
    let build_dir = content_dir.join(".build");
    fs::create_dir_all(&build_dir)?;

    // Create a temporary content file
    let uuid = uuid::Uuid::new_v4();
    let temp_content_name = format!("temp_{}.md", uuid);
    let temp_content_path = build_dir.join(&temp_content_name);

    // Preprocess content to rewrite image paths so Typst/cmarker can resolve them properly
    // For ad-hoc typst renders, include visible tokens to aid preview extraction
    let preprocess = preprocess_markdown(content)?;
    
    // Determine base directory for image path resolution
    // Use the current file's parent directory if available, otherwise fall back to content_dir
    let base_dir = if let Some(file_path) = current_file {
        Path::new(file_path)
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| content_dir.clone())
    } else {
        content_dir.clone()
    };
    
    // Rewrite image paths so Typst can resolve them
    let assets_root = utils::get_assets_dir(app_handle).ok();
    let assets_root_ref = assets_root.as_deref();
    let mut processed = utils::rewrite_image_paths_in_markdown(
        &preprocess.markdown,
        &base_dir,
        assets_root_ref,
    );
    
    // Filter out external image URLs that cmarker can't fetch
    let re_external_img = regex::Regex::new(r"!\[[^\]]*\]\(https?://[^)]+\)")
        .expect("BUG: Invalid regex pattern for external markdown images");
    processed = re_external_img.replace_all(&processed, "").to_string();

    let re_external_html = regex::Regex::new(r#"<img[^>]*src=["']https?://[^"']+["'][^>]*>"#)
        .expect("BUG: Invalid regex pattern for external HTML images");
    processed = re_external_html.replace_all(&processed, "").to_string();
    
    // Remove citation references [@ref] that would cause "label does not exist" errors
    let re_citations = regex::Regex::new(r"\[@[^\]]+\]")
        .expect("BUG: Invalid regex pattern for citations");
    processed = re_citations.replace_all(&processed, "").to_string();
    
    fs::write(&temp_content_path, &processed)?;

    // Setup render configuration - always use content_dir as Typst root
    let config = RenderConfig {
        app_handle,
        build_dir: build_dir.clone(),
        content_dir: content_dir.clone(),
        typst_root: content_dir.clone(),
    };

    // Setup preferences
    render_pipeline::setup_prefs(&config, "typst-temp")?;

    // Ensure the content is available as content.md (required by template)
    fs::copy(&temp_content_path, build_dir.join("content.md"))?;

    // Setup template
    render_pipeline::setup_template(&config, "typst-temp")?;

    // Determine output file name
    let output_file_name = format!("temp_{}.pdf", uuid);
    let output_path = build_dir.join(&output_file_name);

    // Compile with Typst - if it fails, just skip rendering silently
    let compile_result = render_pipeline::compile_typst(&config, &typst_path, &output_file_name);
    
    // Clean up the temporary content file
    let _ = fs::remove_file(&temp_content_path);

    // If compilation failed or output not created, propagate error
    compile_result?;
    
    if !output_path.exists() {
        return Err(anyhow!("Output file was not created: {}", output_path.display()));
    }

    let source_map = build_source_map(app_handle, &typst_path, &build_dir, &content_dir, &preprocess.anchors);
    Ok(RenderedDocument {
        pdf_path: output_path.to_string_lossy().to_string(),
        source_map,
    })
}

