use simplelog::*;
use std::fs::{self, OpenOptions};
use std::path::PathBuf;
use log::LevelFilter;

/// Initialize the logging system
/// 
/// Sets up both file and terminal logging:
/// - File: Always logs DEBUG and above to ~/.capacity-planner/logs/app-YYYY-MM-DD.log
/// - Terminal: DEBUG+ in dev mode, INFO+ in production mode
pub fn init() -> Result<(), Box<dyn std::error::Error>> {
    // Get log directory and ensure it exists
    let log_dir = get_log_directory();
    fs::create_dir_all(&log_dir)?;

    // Get log file path with current date
    let log_file_path = log_dir.join(get_log_filename());

    // Open log file in append mode (safe for multiple instances)
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_path)?;

    // Configure file logger - always DEBUG level
    let file_logger = WriteLogger::new(
        LevelFilter::Debug,
        ConfigBuilder::new()
            .set_time_format_rfc3339()
            .build(),
        log_file,
    );

    // Configure terminal logger - level depends on build mode
    let terminal_level = get_terminal_log_level();
    let terminal_logger = TermLogger::new(
        terminal_level,
        Config::default(),
        TerminalMode::Mixed,
        ColorChoice::Auto,
    );

    // Initialize combined logger
    CombinedLogger::init(vec![
        terminal_logger,
        file_logger,
    ])?;

    // Log initialization success
    log::info!(
        "Logger initialized - Terminal: {:?}, File: {:?} (DEBUG+)",
        terminal_level,
        log_file_path
    );

    Ok(())
}

/// Get the log directory path
/// 
/// Returns: ~/.capacity-planner/logs/
fn get_log_directory() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".capacity-planner")
        .join("logs")
}

/// Get the log filename with current date
/// 
/// Returns: app-YYYY-MM-DD.log (e.g., app-2025-12-27.log)
fn get_log_filename() -> String {
    let today = chrono::Local::now().format("%Y-%m-%d");
    format!("app-{}.log", today)
}

/// Determine terminal log level based on build mode
/// 
/// - Debug builds (cargo run): DEBUG and above
/// - Release builds (cargo run --release): INFO and above
fn get_terminal_log_level() -> LevelFilter {
    if cfg!(debug_assertions) {
        // Development mode - show debug logs
        LevelFilter::Debug
    } else {
        // Production mode - only show info and above
        LevelFilter::Info
    }
}
