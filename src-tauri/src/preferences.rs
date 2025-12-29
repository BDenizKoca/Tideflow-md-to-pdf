use crate::utils;
use anyhow::Result;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter};

// Global monotonically increasing version for preference writes
lazy_static! {
    static ref PREFS_VERSION: AtomicU64 = AtomicU64::new(0);
}

/// User preferences for document rendering and application behavior.
/// 
/// This struct is serialized to/from JSON and must stay in sync with
/// the TypeScript `Preferences` interface in src/types.ts.
/// 
/// Field names use snake_case in Rust but may be renamed during serialization
/// to match Typst conventions (e.g., `number_sections` → `numberSections`).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Preferences {
    /// Typst theme template identifier (e.g., "tideflow", "article")
    #[serde(default = "default_theme_id")]
    pub theme_id: String,
    
    /// Paper size (e.g., "us-letter", "a4") - renamed from paper_size for Typst
    pub papersize: String,
    
    /// Page margins - renamed from margins for Typst compatibility
    pub margin: Margins,
    
    /// Enable table of contents generation
    pub toc: bool,
    
    /// Custom heading for table of contents (empty string = no heading)
    #[serde(default)]
    pub toc_title: String,
    
    /// Enable two-column layout for table of contents
    #[serde(default)]
    pub toc_two_column: bool,
    
    /// Enable two-column layout for main document content
    #[serde(default)]
    pub two_column_layout: bool,
    
    /// Page orientation (portrait or landscape)
    #[serde(default = "default_page_orientation")]
    pub page_orientation: String,
    
    /// Enable cover page
    #[serde(default)]
    pub cover_page: bool,
    
    /// Cover page title text
    #[serde(default)]
    pub cover_title: String,
    
    /// Cover page author/writer text
    #[serde(default)]
    pub cover_writer: String,
    
    /// Path to cover page image (relative to content dir)
    #[serde(default)]
    pub cover_image: String,
    
    /// Cover image width (e.g., "80%", "320px")
    #[serde(default = "default_cover_image_width")]
    pub cover_image_width: String,
    
    /// Enable automatic section numbering - serialized as "numberSections" for Typst
    #[serde(rename = "numberSections")]
    pub number_sections: bool,
    
    /// Default width for inserted images (e.g., "80%", "320px")
    pub default_image_width: String,
    
    /// Default image alignment ("left", "center", "right")
    pub default_image_alignment: String,
    
    /// Font configuration for main text and monospace code
    pub fonts: Fonts,
    
    /// Base font size in points
    #[serde(default = "default_font_size")]
    pub font_size: f32,
    
    /// Page background color (hex format, e.g., "#ffffff")
    #[serde(default = "default_page_bg_color")]
    pub page_bg_color: String,
    
    /// Text color (hex format, e.g., "#000000")
    #[serde(default = "default_font_color")]
    pub font_color: String,
    
    /// Heading size multiplier (1.0 = normal)
    #[serde(default = "default_heading_scale")]
    pub heading_scale: f32,
    
    /// Accent color for links and UI elements (hex format)
    #[serde(default = "default_accent_color")]
    pub accent_color: String,
    
    /// Line height multiplier (e.g., 1.5 = 150%)
    #[serde(default = "default_line_height")]
    pub line_height: f32,
    
    /// Paragraph spacing (e.g., "0.5em", "10pt")
    #[serde(default = "default_paragraph_spacing")]
    pub paragraph_spacing: String,
    
    /// Enable page numbers in footer
    #[serde(default)]
    pub page_numbers: bool,
    
    /// Show document title in header
    #[serde(default)]
    pub header_title: bool,
    
    /// Custom header text (overrides title if set)
    #[serde(default)]
    pub header_text: String,
    
    // Preview optimization settings
    
    /// Debounce delay in milliseconds before re-rendering on edit
    pub render_debounce_ms: u32,
    
    /// Enable focused preview mode (deprecated, kept for compatibility)
    pub focused_preview_enabled: bool,
    
    /// Preserve scroll position between renders
    pub preserve_scroll_position: bool,
    
    /// Show confirmation dialog when closing with unsaved changes
    #[serde(default = "default_confirm_exit")]
    pub confirm_exit_on_unsaved: bool,
    /// Optional explicit path to Typst binary (used as a final fallback)
    #[serde(default)]
    pub typst_path: Option<String>,

    // Bibliography settings

    /// Path to bibliography file (.bib or .yml)
    #[serde(default)]
    pub bibliography_path: Option<String>,

    /// Citation style (e.g., "ieee", "apa", "chicago-author-date")
    #[serde(default)]
    pub bibliography_style: Option<String>,

    /// Custom heading for bibliography section (empty = use default)
    #[serde(default)]
    pub bibliography_title: Option<String>,

    /// Show all bibliography entries (true) or only cited works (false)
    #[serde(default)]
    pub bibliography_show_all: Option<bool>,
}

/// Page margin configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Margins {
    /// Horizontal margin (e.g., "1in", "2.5cm")
    pub x: String,
    /// Vertical margin (e.g., "1in", "2.5cm")
    pub y: String,
}

/// Font configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Fonts {
    /// Main body text font (e.g., "New Computer Modern", "Inter")
    pub main: String,
    /// Monospace font for code blocks (e.g., "JetBrains Mono", "Fira Code")
    pub mono: String,
}

fn default_font_size() -> f32 {
    11.0
}

fn default_page_bg_color() -> String {
    "#ffffff".to_string()
}

fn default_font_color() -> String {
    "#000000".to_string()
}

fn default_heading_scale() -> f32 {
    1.0
}

fn default_accent_color() -> String {
    "#1e40af".to_string()
}

fn default_line_height() -> f32 {
    1.5
}

fn default_paragraph_spacing() -> String {
    "0.65em".to_string()
}

fn default_cover_image_width() -> String {
    "60%".to_string()
}

fn default_confirm_exit() -> bool {
    true
}

fn default_page_orientation() -> String {
    "portrait".to_string()
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            theme_id: default_theme_id(),
            papersize: "a4".to_string(), // Changed from paper_size to papersize
            margin: Margins {
                // Changed from margins to margin
                x: "2cm".to_string(),
                y: "2.5cm".to_string(),
            },
            toc: false, // default disabled
            toc_title: String::new(),
            toc_two_column: false,
            two_column_layout: false,
            page_orientation: "portrait".to_string(),
            cover_page: false,
            cover_title: String::new(),
            cover_writer: String::new(),
            cover_image: String::new(),
            cover_image_width: "60%".to_string(),
            number_sections: true,
            default_image_width: "80%".to_string(),
            default_image_alignment: "center".to_string(),
            fonts: Fonts {
                main: "New Computer Modern".to_string(),
                mono: "Liberation Mono".to_string(),
            },
            font_size: 11.0,
            page_bg_color: "#ffffff".to_string(),
            font_color: "#000000".to_string(),
            heading_scale: 1.0,
            accent_color: "#1e40af".to_string(),
            line_height: 1.5,
            paragraph_spacing: "0.65em".to_string(),
            page_numbers: false,
            header_title: false,
            header_text: String::new(),
            // Preview optimization defaults
            render_debounce_ms: 400, // 400ms for responsive feel
            focused_preview_enabled: true,
            preserve_scroll_position: true,
            confirm_exit_on_unsaved: true,
            typst_path: None,
            // Bibliography defaults
            bibliography_path: None,
            bibliography_style: Some("ieee".to_string()),
            bibliography_title: None,
            bibliography_show_all: Some(false),
        }
    }
}

fn default_theme_id() -> String {
    "default".to_string()
}

#[tauri::command]
pub async fn get_preferences(app_handle: AppHandle) -> Result<Preferences, String> {
    let prefs_path = get_preferences_path(&app_handle)?;

    if !prefs_path.exists() {
        // If preferences don't exist, create default ones
        let default_prefs = Preferences::default();
        save_preferences_to_file(&app_handle, &default_prefs)?;
        return Ok(default_prefs);
    }

    let prefs_content = fs::read_to_string(&prefs_path)
        .map_err(|e| format!("Failed to read preferences: {}", e))?;

    let parsed: Preferences = serde_json::from_str(&prefs_content)
        .map_err(|e| format!("Failed to parse preferences: {}", e))?;
    // Emit prefs-read event (does not advance version)
    let payload = serde_json::json!({
        "event": "read",
        "toc": parsed.toc,
        "numberSections": parsed.number_sections,
        "version": PREFS_VERSION.load(Ordering::Relaxed),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });
    app_handle.emit("prefs-read", payload).ok();
    Ok(parsed)
}

#[tauri::command]
pub async fn set_preferences(
    app_handle: AppHandle,
    preferences: Preferences,
) -> Result<(), String> {
    save_preferences_to_file(&app_handle, &preferences)?;
    apply_preferences_internal(&app_handle, &preferences)
}

#[tauri::command]
pub async fn apply_preferences(app_handle: AppHandle) -> Result<(), String> {
    let preferences = get_preferences(app_handle.clone()).await?;
    apply_preferences_internal(&app_handle, &preferences)
}

fn get_preferences_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let content_dir = utils::get_content_dir(app_handle).map_err(|e| e.to_string())?;
    Ok(content_dir.join("prefs.json"))
}

fn save_preferences_to_file(
    app_handle: &AppHandle,
    preferences: &Preferences,
) -> Result<(), String> {
    let prefs_path = get_preferences_path(app_handle)?;

    let json = serde_json::to_string_pretty(preferences)
        .map_err(|e| format!("Failed to serialize preferences: {}", e))?;

    fs::write(&prefs_path, json).map_err(|e| format!("Failed to write preferences: {}", e))?;
    // Increment version & emit prefs-write event
    let ver = PREFS_VERSION.fetch_add(1, Ordering::Relaxed) + 1;
    let payload = serde_json::json!({
        "event": "write",
        "toc": preferences.toc,
        "numberSections": preferences.number_sections,
        "version": ver,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });
    app_handle.emit("prefs-write", payload).ok();
    Ok(())
}

fn apply_preferences_internal(
    app_handle: &AppHandle,
    preferences: &Preferences,
) -> Result<(), String> {
    // For Typst, we only need to ensure preferences are saved to _prefs.json
    // The template will read this file directly
    save_preferences_to_file(app_handle, preferences)
}
