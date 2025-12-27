// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialize logging first, before anything else
    if let Err(e) = capacity_planner_lib::logger::init() {
        eprintln!("Failed to initialize logger: {}", e);
        // Continue anyway - app can still work without logging
    }
    
    capacity_planner_lib::run()
}
