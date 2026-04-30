mod commands;
mod error;
mod image_export;
mod preferences;
mod preprocessor;
mod render_pipeline;
mod renderer;
mod utils;

use tauri::{Emitter, Manager};

/// Returns the first `.md` or `.qmd` file path passed as a CLI argument, if any.
/// Called by the frontend during initialization to detect Windows file-association launches.
#[tauri::command]
fn get_launch_file_path() -> Option<String> {
    std::env::args().skip(1).find(|arg| {
        let lower = arg.to_lowercase();
        !arg.starts_with('-') && (lower.ends_with(".md") || lower.ends_with(".qmd"))
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // When a second instance is launched with a file path (e.g. double-clicking
    // a .md file while Tideflow is already open), forward it to the running
    // instance via the `open-file` event and bring the window to focus.
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
        if let Some(path) = args.iter().skip(1).find(|a| {
            let lower = a.to_lowercase();
            !a.starts_with('-') && (lower.ends_with(".md") || lower.ends_with(".qmd"))
        }) {
            let _ = app.emit("open-file", path);
        }
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }))
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_shell::init())

    .setup(|app| {
        // Initialize app directories if needed
        let app_handle = app.handle();
        utils::initialize_app_directories(app_handle)?;

        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_launch_file_path,
        commands::read_markdown_file,
        commands::read_binary_file,
        commands::write_markdown_file,
        commands::list_files,
        commands::create_file,
        commands::delete_file,
        commands::rename_file,
        commands::import_image,
        commands::import_image_from_path,
        commands::import_bibliography_from_path,
        commands::render_markdown,
        commands::export_markdown,
        commands::save_pdf_as,
        commands::render_typst,
        commands::export_as_png,
        commands::export_as_svg,
        commands::typst_diagnostics,
        commands::get_cache_stats,
        commands::clear_render_cache,
        commands::debug_paths,
        commands::get_runtime_files,
        commands::cleanup_temp_pdfs,
        commands::cleanup_unused_assets,
        commands::clear_bibliography,
        commands::open_pdf_in_viewer,
        preferences::get_preferences,
        preferences::set_preferences,
        preferences::apply_preferences
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
