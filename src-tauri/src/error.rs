//! Custom error types for better error handling and user feedback.
//!
//! This module defines application-specific error types that provide
//! clear, actionable error messages to the frontend.

use std::io;
use std::path::PathBuf;
use thiserror::Error;

/// Main application error type with specific variants for different failure scenarios.
#[allow(dead_code)]
#[derive(Error, Debug)]
pub enum AppError {
    /// File system operation errors
    #[error("Failed to read file '{path}': {source}")]
    FileRead {
        path: PathBuf,
        #[source]
        source: io::Error,
    },

    #[error("Failed to write file '{path}': {source}")]
    FileWrite {
        path: PathBuf,
        #[source]
        source: io::Error,
    },

    #[error("File not found: '{0}'")]
    FileNotFound(PathBuf),

    #[error("Invalid file path: '{0}'")]
    InvalidPath(String),

    /// Rendering and compilation errors
    #[error("Typst could not be found. Tideflow normally ships with its own copy, so the installation may be incomplete.\n\
             Try reinstalling Tideflow, install Typst system-wide, or choose a Typst binary in Settings › General › Typst Compiler.")]
    TypstNotFound,

    #[error("Typst compilation failed: {0}")]
    TypstCompilation(String),

    #[error("Failed to query PDF positions: {0}")]
    PdfQueryFailed(String),

    /// Preprocessing errors
    #[error("Markdown preprocessing failed: {0}")]
    PreprocessingFailed(String),

    #[error("Invalid anchor format in document")]
    InvalidAnchor,

    /// Image processing errors
    #[error("Failed to import image '{path}': {source}")]
    ImageImport {
        path: PathBuf,
        #[source]
        source: io::Error,
    },

    #[error("Unsupported image format: {0}")]
    UnsupportedImageFormat(String),

    #[error("Image processing failed: {0}")]
    ImageProcessing(String),

    /// Preferences errors
    #[error("Failed to load preferences: {0}")]
    PreferencesLoad(String),

    #[error("Failed to save preferences: {0}")]
    PreferencesSave(String),

    #[error("Invalid preference value: {0}")]
    InvalidPreference(String),

    /// Cache errors
    #[error("Failed to clear cache: {0}")]
    CacheClear(String),

    #[error("Cache directory not accessible: {path}")]
    CacheDirectoryError { path: PathBuf },

    /// Serialization errors
    #[error("JSON serialization failed: {0}")]
    SerializationError(#[from] serde_json::Error),

    /// Generic IO errors
    #[error("IO operation failed: {0}")]
    Io(#[from] io::Error),

    /// Wrapped anyhow errors for compatibility
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

/// Result type alias using AppError
pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    /// Convert AppError to a user-friendly error message string.
    /// This is used by Tauri commands that return Result<T, String>.
    pub fn to_frontend_message(&self) -> String {
        match self {
            AppError::TypstNotFound => {
                "Typst could not be found. Tideflow normally ships with its own copy, so the installation may be incomplete.\n\
                 Try reinstalling Tideflow, install Typst system-wide, or choose a Typst binary in Settings › General › Typst Compiler.".to_string()
            }
            AppError::TypstCompilation(msg) => {
                format!("Compilation error: {}", msg)
            }
            AppError::FileNotFound(path) => {
                format!("File not found: {}", path.display())
            }
            AppError::InvalidPath(path) => {
                format!("Invalid file path: {}", path)
            }
            AppError::ImageImport { path, .. } => {
                format!("Failed to import image: {}", path.display())
            }
            AppError::UnsupportedImageFormat(format) => {
                format!("Unsupported image format: {}", format)
            }
            _ => self.to_string(),
        }
    }
}

/// Helper trait for adding context to Results
#[allow(dead_code)]
pub trait ResultExt<T> {
    /// Add file path context to an IO error
    fn with_file_context(self, path: PathBuf, operation: &str) -> AppResult<T>;
}

impl<T> ResultExt<T> for Result<T, io::Error> {
    fn with_file_context(self, path: PathBuf, operation: &str) -> AppResult<T> {
        self.map_err(|source| match operation {
            "read" => AppError::FileRead { path, source },
            "write" => AppError::FileWrite { path, source },
            _ => AppError::Io(source),
        })
    }
}
