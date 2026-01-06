use crate::api;
use crate::db::DbPool;
use crate::models::{
    Country, CreateHolidayInput, Holiday, HolidayImportPreview, HolidayPreviewItem,
    HolidayWithCountry, ImportHolidaysResult, Person,
};
use log::{debug, error, info, warn};
use std::collections::HashSet;

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

/// Preview holiday import from API for a specific country and year
#[tauri::command]
pub async fn preview_holiday_import(
    pool: tauri::State<'_, DbPool>,
    country_code: String,
    year: i32,
) -> Result<HolidayImportPreview, String> {
    info!("Previewing holiday import for {} in {}", country_code, year);

    let country_code_upper = country_code.to_uppercase();

    // Get country from database
    let country = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE iso_code = ?")
        .bind(&country_code_upper)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch country: {}", e);
            e.to_string()
        })?
        .ok_or_else(|| {
            format!(
                "Country with code '{}' not found in database",
                country_code_upper
            )
        })?;

    // Fetch holidays from API
    let api_holidays = api::fetch_public_holidays(&country_code_upper, year).await?;

    // Get existing holidays for this country and year
    let existing_holidays = sqlx::query_as::<_, Holiday>(
        "SELECT * FROM holidays WHERE country_id = ? AND start_date >= ? AND start_date < ?",
    )
    .bind(country.id)
    .bind(format!("{}-01-01", year))
    .bind(format!("{}-01-01", year + 1))
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch existing holidays: {}", e);
        e.to_string()
    })?;

    let existing_dates: HashSet<String> = existing_holidays
        .iter()
        .map(|h| h.start_date.clone())
        .collect();

    // Build preview items
    let mut holidays = Vec::new();
    let mut duplicate_count = 0;

    for api_holiday in api_holidays {
        let is_duplicate = existing_dates.contains(&api_holiday.date);
        if is_duplicate {
            duplicate_count += 1;
        }

        holidays.push(HolidayPreviewItem {
            date: api_holiday.date.clone(),
            name: api_holiday.name.clone(),
            local_name: api_holiday.local_name.clone(),
            is_duplicate,
        });
    }

    let total_count = holidays.len();
    let new_count = total_count - duplicate_count;

    Ok(HolidayImportPreview {
        country_code: country_code_upper,
        country_name: country.name,
        year,
        holidays,
        total_count,
        duplicate_count,
        new_count,
    })
}

/// Import holidays from API for a specific country and multiple years
#[tauri::command]
pub async fn import_holidays_from_api(
    pool: tauri::State<'_, DbPool>,
    country_code: String,
    years: Vec<i32>,
) -> Result<Vec<ImportHolidaysResult>, String> {
    info!(
        "Importing holidays for {} across {} years",
        country_code,
        years.len()
    );

    let country_code_upper = country_code.to_uppercase();

    // Get country from database
    let country = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE iso_code = ?")
        .bind(&country_code_upper)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch country: {}", e);
            e.to_string()
        })?
        .ok_or_else(|| {
            format!(
                "Country with code '{}' not found in database",
                country_code_upper
            )
        })?;

    let mut results = Vec::new();

    for year in years {
        info!("Importing holidays for {} in {}", country_code_upper, year);

        // Fetch holidays from API
        let api_holidays = match api::fetch_public_holidays(&country_code_upper, year).await {
            Ok(holidays) => holidays,
            Err(e) => {
                error!(
                    "Failed to fetch holidays for {} ({}): {}",
                    country_code_upper, year, e
                );
                continue; // Skip this year but continue with others
            }
        };

        // Get existing holidays for this country and year
        let existing_holidays = sqlx::query_as::<_, Holiday>(
            "SELECT * FROM holidays WHERE country_id = ? AND start_date >= ? AND start_date < ?",
        )
        .bind(country.id)
        .bind(format!("{}-01-01", year))
        .bind(format!("{}-01-01", year + 1))
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch existing holidays: {}", e);
            e.to_string()
        })?;

        let existing_dates: HashSet<String> = existing_holidays
            .iter()
            .map(|h| h.start_date.clone())
            .collect();

        // Import non-duplicate holidays
        let mut imported_count = 0;
        let mut skipped_count = 0;

        for api_holiday in api_holidays {
            if existing_dates.contains(&api_holiday.date) {
                debug!(
                    "Skipping duplicate holiday: {} on {}",
                    api_holiday.local_name, api_holiday.date
                );
                skipped_count += 1;
                continue;
            }

            // Insert holiday (single-day holiday: start_date = end_date)
            sqlx::query(
                "INSERT INTO holidays (country_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
            )
            .bind(country.id)
            .bind(&api_holiday.local_name)
            .bind(&api_holiday.date)
            .bind(&api_holiday.date) // Single day holiday
            .execute(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to insert holiday: {}", e);
                e.to_string()
            })?;

            imported_count += 1;
        }

        info!(
            "Imported {} holidays for {} ({}), skipped {} duplicates",
            imported_count, country_code_upper, year, skipped_count
        );

        results.push(ImportHolidaysResult {
            country_code: country_code_upper.clone(),
            year,
            imported_count,
            skipped_count,
        });
    }

    Ok(results)
}
