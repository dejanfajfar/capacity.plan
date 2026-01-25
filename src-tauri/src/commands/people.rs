use crate::db::DbPool;
use crate::models::{CreatePersonInput, Person, PersonDependencies, PersonWithCountry};
use log::{debug, error, info};

#[tauri::command]
pub async fn list_people(pool: tauri::State<'_, DbPool>) -> Result<Vec<Person>, String> {
    debug!("Fetching all people");

    let people = sqlx::query_as::<_, Person>("SELECT * FROM people ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch people: {}", e);
            e.to_string()
        })?;

    info!("Successfully fetched {} people", people.len());
    Ok(people)
}

#[tauri::command]
pub async fn list_people_with_countries(
    pool: tauri::State<'_, DbPool>,
) -> Result<Vec<PersonWithCountry>, String> {
    debug!("Fetching all people with country details");

    let people = sqlx::query_as::<_, PersonWithCountry>(
        "SELECT 
            p.id,
            p.name,
            p.email,
            p.available_hours_per_week,
            p.country_id,
            c.iso_code as country_iso_code,
            c.name as country_name,
            p.working_days,
            p.created_at
         FROM people p
         LEFT JOIN countries c ON p.country_id = c.id
         ORDER BY p.name",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch people with countries: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} people with country details",
        people.len()
    );
    Ok(people)
}

#[tauri::command]
pub async fn create_person(
    pool: tauri::State<'_, DbPool>,
    input: CreatePersonInput,
) -> Result<Person, String> {
    let result = sqlx::query(
        "INSERT INTO people (name, email, available_hours_per_week, country_id, working_days) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&input.name)
    .bind(&input.email)
    .bind(input.available_hours_per_week)
    .bind(input.country_id)
    .bind(&input.working_days)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(person)
}

#[tauri::command]
pub async fn update_person(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreatePersonInput,
) -> Result<Person, String> {
    sqlx::query(
        "UPDATE people SET name = ?, email = ?, available_hours_per_week = ?, country_id = ?, working_days = ? WHERE id = ?",
    )
    .bind(&input.name)
    .bind(&input.email)
    .bind(input.available_hours_per_week)
    .bind(input.country_id)
    .bind(&input.working_days)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(person)
}

#[tauri::command]
pub async fn delete_person(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting person ID: {}", id);

    // Clear calculated fields for assignments involving this person before deletion
    sqlx::query(
        "UPDATE assignments 
         SET calculated_allocation_percentage = NULL,
             calculated_effective_hours = NULL,
             last_calculated_at = NULL
         WHERE person_id = ?",
    )
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to invalidate assignments: {}", e);
        e.to_string()
    })?;

    // Delete person (CASCADE will delete assignments and absences)
    sqlx::query("DELETE FROM people WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete person: {}", e);
            e.to_string()
        })?;

    info!(
        "Successfully deleted person ID: {} and invalidated allocations",
        id
    );
    Ok(())
}

#[tauri::command]
pub async fn check_person_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<PersonDependencies, String> {
    debug!("Checking dependencies for person ID: {}", id);

    let assignment_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assignments WHERE person_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count assignments: {}", e);
                e.to_string()
            })?;

    let absence_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM absences WHERE person_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count absences: {}", e);
                e.to_string()
            })?;

    info!(
        "Person ID {} has {} assignments and {} absences",
        id, assignment_count, absence_count
    );

    Ok(PersonDependencies {
        assignment_count,
        absence_count,
    })
}
