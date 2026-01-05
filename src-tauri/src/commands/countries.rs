use crate::db::DbPool;
use crate::models::{Country, CountryDependencies, CreateCountryInput};
use log::{debug, error, info, warn};

#[tauri::command]
pub async fn list_countries(pool: tauri::State<'_, DbPool>) -> Result<Vec<Country>, String> {
    debug!("Fetching all countries");

    let countries = sqlx::query_as::<_, Country>("SELECT * FROM countries ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch countries: {}", e);
            e.to_string()
        })?;

    info!("Successfully fetched {} countries", countries.len());
    Ok(countries)
}

#[tauri::command]
pub async fn create_country(
    pool: tauri::State<'_, DbPool>,
    input: CreateCountryInput,
) -> Result<Country, String> {
    debug!("Creating country: {}", input.name);

    // Validate ISO code format: exactly 3 uppercase letters
    let iso_code = input.iso_code.trim().to_uppercase();
    if iso_code.len() != 3 || !iso_code.chars().all(|c| c.is_ascii_alphabetic()) {
        warn!("Invalid ISO code format: {}", iso_code);
        return Err(
            "ISO code must be exactly 3 uppercase letters (e.g., USA, GBR, DEU)".to_string(),
        );
    }

    let result = sqlx::query("INSERT INTO countries (iso_code, name) VALUES (?, ?)")
        .bind(&iso_code)
        .bind(&input.name)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to insert country: {}", e);
            if e.to_string().contains("UNIQUE constraint failed") {
                format!("Country with ISO code '{}' already exists", iso_code)
            } else {
                e.to_string()
            }
        })?;

    let id = result.last_insert_rowid();
    debug!("Inserted country with ID: {}", id);

    let country = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created country: {}", e);
            e.to_string()
        })?;

    info!("Successfully created country: {}", country.name);
    Ok(country)
}

#[tauri::command]
pub async fn update_country(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateCountryInput,
) -> Result<Country, String> {
    debug!("Updating country ID: {}", id);

    // Validate ISO code format: exactly 3 uppercase letters
    let iso_code = input.iso_code.trim().to_uppercase();
    if iso_code.len() != 3 || !iso_code.chars().all(|c| c.is_ascii_alphabetic()) {
        warn!("Invalid ISO code format: {}", iso_code);
        return Err(
            "ISO code must be exactly 3 uppercase letters (e.g., USA, GBR, DEU)".to_string(),
        );
    }

    sqlx::query("UPDATE countries SET iso_code = ?, name = ? WHERE id = ?")
        .bind(&iso_code)
        .bind(&input.name)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to update country: {}", e);
            if e.to_string().contains("UNIQUE constraint failed") {
                format!("Country with ISO code '{}' already exists", iso_code)
            } else {
                e.to_string()
            }
        })?;

    let country = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated country: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated country: {}", country.name);
    Ok(country)
}

#[tauri::command]
pub async fn delete_country(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting country ID: {}", id);

    // Delete country (CASCADE will delete holidays, SET NULL will update people)
    sqlx::query("DELETE FROM countries WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete country: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted country ID: {}", id);
    Ok(())
}

#[tauri::command]
pub async fn check_country_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<CountryDependencies, String> {
    debug!("Checking dependencies for country ID: {}", id);

    let holiday_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM holidays WHERE country_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count holidays: {}", e);
                e.to_string()
            })?;

    let people_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM people WHERE country_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count people: {}", e);
                e.to_string()
            })?;

    info!(
        "Country ID {} has {} holidays and {} people",
        id, holiday_count, people_count
    );

    Ok(CountryDependencies {
        holiday_count,
        people_count,
    })
}
