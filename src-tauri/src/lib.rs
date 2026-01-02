mod capacity;
mod commands;
mod db;
pub mod logger;
mod models;

use commands::{
    batch_upsert_project_requirements, check_person_dependencies,
    check_planning_period_dependencies, check_project_dependencies, create_absence,
    create_assignment, create_overhead, create_overhead_assignment, create_person,
    create_planning_period, create_project, delete_absence, delete_assignment, delete_overhead,
    delete_overhead_assignment, delete_person, delete_planning_period, delete_project,
    delete_project_requirement, get_capacity_overview, get_person_capacity,
    get_project_requirement, get_project_staffing, list_absences, list_assignments,
    list_overhead_assignments, list_overheads, list_people, list_person_overhead_assignments,
    list_planning_periods, list_project_requirements, list_projects, optimize_assignments,
    update_absence, update_assignment, update_overhead, update_overhead_assignment, update_person,
    update_planning_period, update_project, upsert_project_requirement,
};
use db::init_database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let pool = tauri::async_runtime::block_on(async {
                init_database()
                    .await
                    .expect("Failed to initialize database")
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
            check_person_dependencies,
            list_projects,
            create_project,
            update_project,
            delete_project,
            check_project_dependencies,
            list_planning_periods,
            create_planning_period,
            update_planning_period,
            delete_planning_period,
            check_planning_period_dependencies,
            list_project_requirements,
            get_project_requirement,
            upsert_project_requirement,
            batch_upsert_project_requirements,
            delete_project_requirement,
            list_assignments,
            create_assignment,
            update_assignment,
            delete_assignment,
            list_absences,
            create_absence,
            update_absence,
            delete_absence,
            list_overheads,
            create_overhead,
            update_overhead,
            delete_overhead,
            list_overhead_assignments,
            list_person_overhead_assignments,
            create_overhead_assignment,
            update_overhead_assignment,
            delete_overhead_assignment,
            optimize_assignments,
            get_capacity_overview,
            get_person_capacity,
            get_project_staffing,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
