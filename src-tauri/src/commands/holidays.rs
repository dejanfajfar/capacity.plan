use crate::db::DbPool;
use crate::models::{CreateHolidayInput, Holiday, HolidayWithCountry, Person};
use log::{debug, error, info, warn};

#[tauri::command]
pub async fn list_holidays(
    pool: tauri::State<'_, DbPool>,
    country_id: Option<i64>,
) -> Result<Vec<HolidayWithCountry>, String> {
    debug!("Fetching holidays");

    let holidays = if let Some(cid) = country_id {
        debug!("Filtering by country ID: {}", cid);
        sqlx::query_as::<_, HolidayWithCountry>(
            "SELECT h.id, h.country_id, c.iso_code as country_iso_code, c.name as country_name,
                    h.name, h.start_date, h.end_date, h.created_at
             FROM holidays h
             JOIN countries c ON h.country_id = c.id
             WHERE h.country_id = ?
             ORDER BY h.start_date, c.name",
        )
        .bind(cid)
        .fetch_all(pool.inner())
        .await
    } else {
        sqlx::query_as::<_, HolidayWithCountry>(
            "SELECT h.id, h.country_id, c.iso_code as country_iso_code, c.name as country_name,
                    h.name, h.start_date, h.end_date, h.created_at
             FROM holidays h
             JOIN countries c ON h.country_id = c.id
             ORDER BY c.name, h.start_date",
        )
        .fetch_all(pool.inner())
        .await
    }
    .map_err(|e| {
        error!("Failed to fetch holidays: {}", e);
        e.to_string()
    })?;

    info!("Successfully fetched {} holidays", holidays.len());
    Ok(holidays)
}

#[tauri::command]
pub async fn list_holidays_for_person(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
    start_date: String,
    end_date: String,
) -> Result<Vec<Holiday>, String> {
    debug!(
        "Fetching holidays for person ID: {} between {} and {}",
        person_id, start_date, end_date
    );

    // First get the person's country
    let person = sqlx::query_as::<_, Person>("SELECT * FROM people WHERE id = ?")
        .bind(person_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch person: {}", e);
            e.to_string()
        })?;

    // If person has no country, return empty list
    let country_id = match person.country_id {
        Some(cid) => cid,
        None => {
            debug!("Person has no country assigned, returning empty holidays list");
            return Ok(vec![]);
        }
    };

    // Query holidays for the person's country within the date range
    // A holiday overlaps if: holiday_start <= range_end AND holiday_end >= range_start
    let holidays = sqlx::query_as::<_, Holiday>(
        "SELECT * FROM holidays 
         WHERE country_id = ? 
         AND start_date <= ? 
         AND end_date >= ?
         ORDER BY start_date",
    )
    .bind(country_id)
    .bind(&end_date)
    .bind(&start_date)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch holidays for person: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} holidays for person ID: {}",
        holidays.len(),
        person_id
    );
    Ok(holidays)
}

#[tauri::command]
pub async fn create_holiday(
    pool: tauri::State<'_, DbPool>,
    input: CreateHolidayInput,
) -> Result<Holiday, String> {
    debug!("Creating holiday for country ID: {}", input.country_id);

    // Validate dates: start_date <= end_date
    if input.start_date > input.end_date {
        warn!("Invalid date range: start date after end date");
        return Err("Start date must be on or before end date".to_string());
    }

    // Check for overlapping holidays in the same country
    let overlapping_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM holidays 
         WHERE country_id = ? 
         AND start_date <= ? 
         AND end_date >= ?",
    )
    .bind(input.country_id)
    .bind(&input.end_date)
    .bind(&input.start_date)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to check for overlapping holidays: {}", e);
        e.to_string()
    })?;

    if overlapping_count > 0 {
        warn!(
            "Overlapping holiday detected for country ID: {}",
            input.country_id
        );
        return Err("A holiday already exists for this country during this period. Overlapping holidays are not allowed.".to_string());
    }

    let result = sqlx::query(
        "INSERT INTO holidays (country_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
    )
    .bind(input.country_id)
    .bind(&input.name)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert holiday: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted holiday with ID: {}", id);

    let holiday = sqlx::query_as::<_, Holiday>("SELECT * FROM holidays WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created holiday: {}", e);
            e.to_string()
        })?;

    info!("Successfully created holiday");
    Ok(holiday)
}

#[tauri::command]
pub async fn update_holiday(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateHolidayInput,
) -> Result<Holiday, String> {
    debug!("Updating holiday ID: {}", id);

    // Validate dates: start_date <= end_date
    if input.start_date > input.end_date {
        warn!("Invalid date range: start date after end date");
        return Err("Start date must be on or before end date".to_string());
    }

    // Check for overlapping holidays in the same country (excluding current holiday)
    let overlapping_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM holidays 
         WHERE country_id = ? 
         AND id != ?
         AND start_date <= ? 
         AND end_date >= ?",
    )
    .bind(input.country_id)
    .bind(id)
    .bind(&input.end_date)
    .bind(&input.start_date)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to check for overlapping holidays: {}", e);
        e.to_string()
    })?;

    if overlapping_count > 0 {
        warn!(
            "Overlapping holiday detected for country ID: {}",
            input.country_id
        );
        return Err("A holiday already exists for this country during this period. Overlapping holidays are not allowed.".to_string());
    }

    sqlx::query(
        "UPDATE holidays SET country_id = ?, name = ?, start_date = ?, end_date = ? WHERE id = ?",
    )
    .bind(input.country_id)
    .bind(&input.name)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update holiday: {}", e);
        e.to_string()
    })?;

    let holiday = sqlx::query_as::<_, Holiday>("SELECT * FROM holidays WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated holiday: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated holiday ID: {}", id);
    Ok(holiday)
}

#[tauri::command]
pub async fn delete_holiday(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting holiday ID: {}", id);

    sqlx::query("DELETE FROM holidays WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete holiday: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted holiday ID: {}", id);
    Ok(())
}

#[tauri::command]
pub async fn batch_create_holidays(
    pool: tauri::State<'_, DbPool>,
    holidays: Vec<CreateHolidayInput>,
) -> Result<(), String> {
    debug!("Batch creating {} holidays", holidays.len());

    // Start a transaction
    let mut tx = pool.begin().await.map_err(|e| {
        error!("Failed to start transaction: {}", e);
        e.to_string()
    })?;

    for holiday in holidays {
        // Validate dates
        if holiday.start_date > holiday.end_date {
            return Err("Start date must be on or before end date for all holidays".to_string());
        }

        sqlx::query(
            "INSERT INTO holidays (country_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
        )
        .bind(holiday.country_id)
        .bind(&holiday.name)
        .bind(&holiday.start_date)
        .bind(&holiday.end_date)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Failed to insert holiday in batch: {}", e);
            e.to_string()
        })?;
    }

    tx.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {}", e);
        e.to_string()
    })?;

    info!("Successfully batch created holidays");
    Ok(())
}
