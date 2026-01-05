use crate::db::DbPool;
use crate::models::{Absence, CreateAbsenceInput};
use log::{debug, error, info};

#[tauri::command]
pub async fn list_absences(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
) -> Result<Vec<Absence>, String> {
    debug!("Fetching absences for person ID: {}", person_id);

    let absences = sqlx::query_as::<_, Absence>(
        "SELECT * FROM absences WHERE person_id = ? ORDER BY start_date DESC",
    )
    .bind(person_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch absences: {}", e);
        e.to_string()
    })?;

    info!("Successfully fetched {} absences", absences.len());
    Ok(absences)
}

#[tauri::command]
pub async fn create_absence(
    pool: tauri::State<'_, DbPool>,
    input: CreateAbsenceInput,
) -> Result<Absence, String> {
    debug!("Creating absence for person ID: {}", input.person_id);

    let result = sqlx::query(
        "INSERT INTO absences (person_id, start_date, end_date, days, reason) 
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(input.person_id)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(input.days)
    .bind(&input.reason)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert absence: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted absence with ID: {}", id);

    let absence = sqlx::query_as::<_, Absence>("SELECT * FROM absences WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created absence: {}", e);
            e.to_string()
        })?;

    info!("Successfully created absence");
    Ok(absence)
}

#[tauri::command]
pub async fn update_absence(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateAbsenceInput,
) -> Result<Absence, String> {
    debug!("Updating absence ID: {}", id);

    sqlx::query(
        "UPDATE absences 
         SET start_date = ?, end_date = ?, days = ?, reason = ?
         WHERE id = ?",
    )
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(input.days)
    .bind(&input.reason)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update absence: {}", e);
        e.to_string()
    })?;

    let absence = sqlx::query_as::<_, Absence>("SELECT * FROM absences WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated absence: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated absence ID: {}", id);
    Ok(absence)
}

#[tauri::command]
pub async fn delete_absence(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting absence ID: {}", id);

    sqlx::query("DELETE FROM absences WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete absence: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted absence ID: {}", id);
    Ok(())
}
