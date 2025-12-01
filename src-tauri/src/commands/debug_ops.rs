/// Debug and diagnostic commands: system inspection and troubleshooting
use crate::{preferences, utils};
use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Serialize)]
pub struct TypstDiagnostics {
    pub detected_binary: Option<String>,
    pub attempted_binary_paths: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DebugPathsResponse {
    pub content_dir: String,
    pub build_dir: String,
    pub prefs_path: String,
    pub build_prefs_path: String,
    pub prefs_json: serde_json::Value,
    pub build_prefs_json: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct RuntimeFilesResponse {
    pub prefs_json_raw: Option<String>,
    pub template_raw: Option<String>,
    pub prefs_path: String,
    pub template_path: String,
}

#[tauri::command]
pub async fn typst_diagnostics(app_handle: AppHandle) -> Result<TypstDiagnostics, String> {
    let mut attempted_paths: Vec<String> = Vec::new();
    let (detected, err_msg) = match utils::get_typst_path(&app_handle) {
        Ok(p) => (Some(p.display().to_string()), None),
        Err(e) => (None, Some(e.to_string()))
    };
    
    if detected.is_none() {
        // Reconstruct attempted paths like utils does
        if let Ok(app_dir) = utils::get_app_dir(&app_handle) {
            let platform_dir = if cfg!(target_os = "windows") { "windows" } else if cfg!(target_os = "macos") { "macos" } else { "linux" };
            let platform_base = app_dir.join("bin").join("typst").join(platform_dir);
            if cfg!(target_os = "windows") {
                attempted_paths.push(platform_base.join("typst.exe").display().to_string());
            } else {
                attempted_paths.push(platform_base.join("typst").display().to_string());
            }
        }
    }

    Ok(TypstDiagnostics {
        detected_binary: detected,
        attempted_binary_paths: attempted_paths,
        error: err_msg,
    })
}

/// Debug helper: inspect where preferences are stored and what the renderer likely used last.
#[tauri::command]
pub async fn debug_paths(app_handle: AppHandle) -> Result<DebugPathsResponse, String> {
    let content_dir = utils::get_content_dir(&app_handle)
        .map_err(|e| e.to_string())?;
    let build_dir = content_dir.join(".build");
    let prefs_path = content_dir.join("prefs.json");
    let build_prefs_path = build_dir.join("prefs.json");

    // Load current logical preferences via API (source of truth at time of call)
    let prefs_struct = preferences::get_preferences(app_handle.clone()).await?;
    let prefs_json = serde_json::to_value(&prefs_struct)
        .map_err(|e| e.to_string())?;

    // Attempt to read build prefs (may not exist if no render yet)
    let build_prefs_json = if build_prefs_path.exists() {
        match std::fs::read_to_string(&build_prefs_path) {
            Ok(txt) => serde_json::from_str(&txt).ok(),
            Err(_) => None,
        }
    } else { None };

    Ok(DebugPathsResponse {
        content_dir: content_dir.to_string_lossy().to_string(),
        build_dir: build_dir.to_string_lossy().to_string(),
        prefs_path: prefs_path.to_string_lossy().to_string(),
        build_prefs_path: build_prefs_path.to_string_lossy().to_string(),
        prefs_json,
        build_prefs_json,
    })
}

#[tauri::command]
pub async fn get_runtime_files(app_handle: AppHandle) -> Result<RuntimeFilesResponse, String> {
    let content_dir = utils::get_content_dir(&app_handle).map_err(|e| e.to_string())?;
    let prefs_path = content_dir.join("prefs.json");
    let template_path = content_dir.join("tideflow.typ");
    let prefs_json_raw = std::fs::read_to_string(&prefs_path).ok();
    let template_raw = std::fs::read_to_string(&template_path).ok();
    Ok(RuntimeFilesResponse {
        prefs_json_raw,
        template_raw,
        prefs_path: prefs_path.to_string_lossy().to_string(),
        template_path: template_path.to_string_lossy().to_string(),
    })
}
