mod api;
mod capacity;
mod commands;
mod db;
pub mod logger;
mod models;

use commands::{
    batch_create_holidays, batch_create_person_job_assignments, batch_upsert_project_requirements,
    check_country_dependencies, check_job_dependencies, check_person_dependencies,
    check_planning_period_dependencies, check_project_dependencies, create_absence,
    create_assignment, create_country, create_holiday, create_job, create_job_overhead_task,
    create_person, create_person_job_assignment, create_planning_period, create_project,
    delete_absence, delete_all_countries_and_holidays, delete_assignment, delete_country,
    delete_holiday, delete_job, delete_job_overhead_task, delete_person,
    delete_person_job_assignment, delete_planning_period, delete_project,
    delete_project_requirement, fetch_available_countries_for_import, get_capacity_overview,
    get_job, get_person_capacity, get_project_requirement, get_project_staffing,
    import_countries_from_api, import_holidays_from_api, list_absences, list_assignments,
    list_countries, list_holidays, list_holidays_for_person, list_job_overhead_tasks, list_jobs,
    list_people, list_people_with_countries, list_person_job_assignments,
    list_person_jobs_for_person, list_planning_periods, list_project_requirements, list_projects,
    optimize_assignments, preview_holiday_import, update_absence, update_assignment,
    update_country, update_holiday, update_job, update_job_overhead_task, update_person,
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
            list_people_with_countries,
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
            list_jobs,
            get_job,
            create_job,
            update_job,
            delete_job,
            check_job_dependencies,
            list_job_overhead_tasks,
            create_job_overhead_task,
            update_job_overhead_task,
            delete_job_overhead_task,
            list_person_job_assignments,
            list_person_jobs_for_person,
            create_person_job_assignment,
            batch_create_person_job_assignments,
            delete_person_job_assignment,
            list_countries,
            create_country,
            update_country,
            delete_country,
            check_country_dependencies,
            fetch_available_countries_for_import,
            import_countries_from_api,
            delete_all_countries_and_holidays,
            list_holidays,
            list_holidays_for_person,
            create_holiday,
            update_holiday,
            delete_holiday,
            batch_create_holidays,
            preview_holiday_import,
            import_holidays_from_api,
            optimize_assignments,
            get_capacity_overview,
            get_person_capacity,
            get_project_staffing,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
