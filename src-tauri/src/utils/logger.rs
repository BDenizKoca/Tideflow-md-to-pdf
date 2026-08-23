//! Production-safe logging utilities for Rust backend
//!
//! Features:
//! - Conditional compilation for debug/release builds
//! - Structured logging with component context
//! - Timestamp support
//! - Minimal overhead in release builds

use std::fmt::Display;

/// Log level enum
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

/// Log a debug message (only in debug builds)
///
/// The release arm still references the arguments. Without it the macro expands
/// to nothing, and every value bound solely to be logged - `if let Err(e) = ..`
/// and friends - becomes an unused-variable warning in release builds only.
#[macro_export]
macro_rules! log_debug {
    ($component:expr, $($arg:tt)*) => {
        #[cfg(debug_assertions)]
        {
            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            println!("[{}] [{}] [DEBUG] {}", timestamp, $component, format!($($arg)*));
        }
        #[cfg(not(debug_assertions))]
        {
            let _ = $component;
            let _ = format_args!($($arg)*);
        }
    };
}

/// Log an info message
#[macro_export]
macro_rules! log_info {
    ($component:expr, $($arg:tt)*) => {
        {
            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            println!("[{}] [{}] [INFO] {}", timestamp, $component, format!($($arg)*));
        }
    };
}

/// Log a warning message
#[macro_export]
macro_rules! log_warn {
    ($component:expr, $($arg:tt)*) => {
        {
            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            eprintln!("[{}] [{}] [WARN] {}", timestamp, $component, format!($($arg)*));
        }
    };
}

/// Log an error message
#[macro_export]
macro_rules! log_error {
    ($component:expr, $($arg:tt)*) => {
        {
            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            eprintln!("[{}] [{}] [ERROR] {}", timestamp, $component, format!($($arg)*));
        }
    };
}

/// Logger struct for scoped logging
#[allow(dead_code)]
pub struct Logger {
    component: String,
}

#[allow(dead_code)]
impl Logger {
    /// Create a new logger for a specific component
    pub fn new(component: impl Into<String>) -> Self {
        Self {
            component: component.into(),
        }
    }

    /// Log a debug message (only in debug builds)
    #[cfg(debug_assertions)]
    pub fn debug(&self, message: impl Display) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        println!(
            "[{}] [{}] [DEBUG] {}",
            timestamp, self.component, message
        );
    }

    /// Log a debug message (no-op in release builds)
    #[cfg(not(debug_assertions))]
    pub fn debug(&self, _message: impl Display) {
        // No-op in release builds
    }

    /// Log an info message
    pub fn info(&self, message: impl Display) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        println!("[{}] [{}] [INFO] {}", timestamp, self.component, message);
    }

    /// Log a warning message
    pub fn warn(&self, message: impl Display) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        eprintln!(
            "[{}] [{}] [WARN] {}",
            timestamp, self.component, message
        );
    }

    /// Log an error message
    pub fn error(&self, message: impl Display) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        eprintln!(
            "[{}] [{}] [ERROR] {}",
            timestamp, self.component, message
        );
    }

    /// Log an error with additional context
    pub fn error_with_context(&self, message: impl Display, error: &dyn std::error::Error) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        eprintln!(
            "[{}] [{}] [ERROR] {}: {}",
            timestamp, self.component, message, error
        );
    }

    /// Time an operation (returns elapsed time in milliseconds)
    pub fn time<F, R>(&self, _operation: &str, f: F) -> R
    where
        F: FnOnce() -> R,
    {
        let start = std::time::Instant::now();
        let result = f();
        let _duration = start.elapsed();

        #[cfg(debug_assertions)]
        {
            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            println!(
                "[{}] [{}] [DEBUG] {} completed in {:.2}ms",
                timestamp,
                self.component,
                _operation,
                _duration.as_secs_f64() * 1000.0
            );
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logger_creation() {
        let logger = Logger::new("TestComponent");
        assert_eq!(logger.component, "TestComponent");
    }

    #[test]
    fn test_logger_methods() {
        let logger = Logger::new("Test");
        logger.debug("Debug message");
        logger.info("Info message");
        logger.warn("Warning message");
        logger.error("Error message");
    }

    #[test]
    fn test_logger_timing() {
        let logger = Logger::new("Test");
        let result = logger.time("test operation", || {
            std::thread::sleep(std::time::Duration::from_millis(10));
            42
        });
        assert_eq!(result, 42);
    }
}
