/// File operation commands: CRUD operations for markdown files and directories
use crate::error::AppError;
use crate::utils;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub async fn read_markdown_file(path: &str) -> Result<String, String> {
    // Validate path format
    if path.is_empty() {
        return Err(AppError::InvalidPath("Empty path provided".to_string()).to_frontend_message());
    }
    
    // Check if path exists first to give a better error message
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(AppError::FileNotFound(path_obj.to_path_buf()).to_frontend_message());
    }
    
    // Read the file
    fs::read_to_string(path).map_err(|e| {
        AppError::FileRead {
            path: path_obj.to_path_buf(),
            source: e,
        }
        .to_frontend_message()
    })
}

#[tauri::command]
pub async fn write_markdown_file(path: &str, content: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    
    // Ensure parent directory exists
    if let Some(parent) = path_obj.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            AppError::FileWrite {
                path: parent.to_path_buf(),
                source: e,
            }
            .to_frontend_message()
        })?;
    }
    
    // Strip any preview-only raw-typst comments (e.g., <!--raw-typst ... -->)
    // to avoid persisting invisible TFANCHOR tokens into user files.
    let re = regex::Regex::new(r"(?is)<!--\s*raw-typst[\s\S]*?-->").map_err(|e| e.to_string())?;
    let cleaned = re.replace_all(content, "").to_string();

    fs::write(path, cleaned).map_err(|e| {
        AppError::FileWrite {
            path: path_obj.to_path_buf(),
            source: e,
        }
        .to_frontend_message()
    })
}

#[tauri::command]
pub async fn read_binary_file(path: &str) -> Result<Vec<u8>, String> {
    // Validate path format
    if path.is_empty() {
        return Err(AppError::InvalidPath("Empty path provided".to_string()).to_frontend_message());
    }
    
    // Check if path exists first to give a better error message
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(AppError::FileNotFound(path_obj.to_path_buf()).to_frontend_message());
    }
    
    // Read the file as binary
    fs::read(path).map_err(|e| {
        AppError::FileRead {
            path: path_obj.to_path_buf(),
            source: e,
        }
        .to_frontend_message()
    })
}

#[tauri::command]
pub async fn list_files(app_handle: AppHandle, dir_path: &str) -> Result<Vec<FileEntry>, String> {
    list_files_internal(app_handle, dir_path).await
}

async fn list_files_internal(app_handle: AppHandle, dir_path: &str) -> Result<Vec<FileEntry>, String> {
    let path = if dir_path.is_empty() {
        utils::get_content_dir(&app_handle)
            .map_err(|e| e.to_string())?
    } else {
        PathBuf::from(dir_path)
    };

    if !path.exists() {
        return Err(format!("Directory does not exist: {}", path.display()));
    }

    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let file_name = entry
            .file_name()
            .to_string_lossy()
            .to_string();
        
        // Skip hidden files and the .build directory
        if file_name.starts_with('.') || file_name == ".build" {
            continue;
        }

        let path_str = entry.path().to_string_lossy().to_string();
        
        let children = if metadata.is_dir() {
            Some(Box::pin(list_files_internal(app_handle.clone(), &path_str)).await?)
        } else {
            None
        };

        files.push(FileEntry {
            name: file_name,
            path: path_str,
            is_dir: metadata.is_dir(),
            children,
        });
    }

    // Sort directories first, then files alphabetically
    files.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(files)
}

#[tauri::command]
pub async fn create_file(
    app_handle: AppHandle,
    name: &str,
    template: Option<&str>,
    dir_path: Option<&str>,
) -> Result<String, String> {
    // Determine parent directory
    let parent_dir = match dir_path {
        Some(dir) => PathBuf::from(dir),
        None => utils::get_content_dir(&app_handle)
            .map_err(|e| e.to_string())?,
    };

    // Ensure parent directory exists
    fs::create_dir_all(&parent_dir).map_err(|e| e.to_string())?;

    // Create file path
    let file_path = parent_dir.join(name);

    // If file already exists, return error
    if file_path.exists() {
        return Err(format!("File already exists: {}", file_path.display()));
    }

    // Determine content to write
    let content = match template {
        Some(template_name) => {
            let templates_dir = utils::get_templates_dir(&app_handle)
                .map_err(|e| e.to_string())?;
            let template_path = templates_dir.join(template_name);
            
            if template_path.exists() {
                fs::read_to_string(template_path).map_err(|e| e.to_string())?
            } else {
                return Err(format!("Template not found: {}", template_name));
            }
        },
        None => {
            // Default minimal content for Typst
            "# New Document\n\nStart writing here...\n".to_string()
        }
    };

    // Write content to file
    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_file(path: &str) -> Result<(), String> {
    let path = Path::new(path);
    
    if !path.exists() {
        return Err("File does not exist".into());
    }
    
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn rename_file(old_path: &str, new_name: &str) -> Result<String, String> {
    let old_path = Path::new(old_path);
    
    if !old_path.exists() {
        return Err("File does not exist".into());
    }
    
    let parent = old_path.parent()
        .ok_or_else(|| "Cannot determine parent directory".to_string())?;
    
    let new_path = parent.join(new_name);
    
    if new_path.exists() {
        return Err("Destination already exists".into());
    }
    
    fs::rename(old_path, &new_path).map_err(|e| e.to_string())?;
    
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_pdf_in_viewer(pdf_path: &str) -> Result<(), String> {
    let path = Path::new(pdf_path);
    if !path.exists() {
        return Err(format!("PDF file does not exist: {}", pdf_path));
    }
    
    // Convert to absolute path
    let absolute_path = path.canonicalize()
        .map_err(|e| format!("Failed to resolve path: {}", e))?;
    
    // Print the PDF directly to default printer
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        
        let pdf_path_str = absolute_path.to_string_lossy().to_string();
        
        // Use PowerShell ShellExecute with 'print' verb
        // This sends directly to default printer (Windows standard behavior)
        let ps_command = format!(
            "(New-Object -ComObject Shell.Application).ShellExecute('{}', '', '', 'print', 0)",
            pdf_path_str.replace("'", "''")
        );
        
        let result = Command::new("powershell")
            .args(&[
                "-WindowStyle", "Hidden",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &ps_command
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn();
            
        result.map_err(|e| format!("Failed to print PDF: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("lpr")
            .arg(absolute_path)
            .spawn()
            .map_err(|e| format!("Failed to print PDF: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("lpr")
            .arg(absolute_path)
            .spawn()
            .map_err(|e| format!("Failed to print PDF: {}", e))?;
    }
    
    Ok(())
}
