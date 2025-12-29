mod commands;
mod error;
mod image_export;
mod preferences;
mod preprocessor;
mod render_pipeline;
mod renderer;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
