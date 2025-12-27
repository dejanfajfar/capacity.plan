mod db;
mod models;
mod commands;

use db::init_database;
use commands::{
    list_people, create_person, update_person, delete_person,
    list_projects, create_project, update_project, delete_project,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let pool = tauri::async_runtime::block_on(async {
                init_database().await.expect("Failed to initialize database")
            });
            
            // Manage database pool state
            app.manage(pool);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_people,
            create_person,
            update_person,
            delete_person,
            list_projects,
            create_project,
            update_project,
            delete_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
