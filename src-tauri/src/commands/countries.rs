use crate::api;
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

    // Validate ISO code format: exactly 2 uppercase letters (alpha-2)
    let iso_code = input.iso_code.trim().to_uppercase();
    if iso_code.len() != 2 || !iso_code.chars().all(|c| c.is_ascii_alphabetic()) {
        warn!("Invalid ISO code format: {}", iso_code);
        return Err(
            "ISO code must be exactly 2 uppercase letters (e.g., US, GB, DE)".to_string(),
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

    // Validate ISO code format: exactly 2 uppercase letters (alpha-2)
    let iso_code = input.iso_code.trim().to_uppercase();
    if iso_code.len() != 2 || !iso_code.chars().all(|c| c.is_ascii_alphabetic()) {
        warn!("Invalid ISO code format: {}", iso_code);
        return Err(
            "ISO code must be exactly 2 uppercase letters (e.g., US, GB, DE)".to_string(),
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

/// Fetches available countries from Nager.Date API
#[tauri::command]
pub async fn fetch_available_countries_for_import() -> Result<Vec<api::NagerDateCountry>, String> {
    info!("Fetching available countries from API");
    api::fetch_available_countries().await
}

/// Imports multiple countries from the API
#[tauri::command]
pub async fn import_countries_from_api(
    pool: tauri::State<'_, DbPool>,
    country_codes: Vec<String>,
) -> Result<Vec<Country>, String> {
    info!("Importing {} countries from API", country_codes.len());
    
    // Fetch all available countries from API
    let available_countries = api::fetch_available_countries().await?;
    
    let mut imported_countries = Vec::new();
    
    for code in country_codes {
        let code_upper = code.to_uppercase();
        
        // Find country info from API
        let api_country = available_countries
            .iter()
            .find(|c| c.country_code == code_upper)
            .ok_or_else(|| format!("Country code '{}' not found in API", code_upper))?;
        
        // Check if already exists
        let existing = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE iso_code = ?")
            .bind(&api_country.country_code)
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to check existing country: {}", e);
                e.to_string()
            })?;
        
        if let Some(country) = existing {
            info!("Country {} already exists, skipping", country.name);
            imported_countries.push(country);
            continue;
        }
        
        // Insert country
        let result = sqlx::query("INSERT INTO countries (iso_code, name) VALUES (?, ?)")
            .bind(&api_country.country_code)
            .bind(&api_country.name)
            .execute(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to insert country {}: {}", api_country.name, e);
                e.to_string()
            })?;
        
        let id = result.last_insert_rowid();
        
        let country = sqlx::query_as::<_, Country>("SELECT * FROM countries WHERE id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to fetch created country: {}", e);
                e.to_string()
            })?;
        
        info!("Successfully imported country: {}", country.name);
        imported_countries.push(country);
    }
    
    info!("Successfully imported {} countries", imported_countries.len());
    Ok(imported_countries)
}

/// Deletes all countries and holidays (DESTRUCTIVE!)
#[tauri::command]
pub async fn delete_all_countries_and_holidays(pool: tauri::State<'_, DbPool>) -> Result<(), String> {
    warn!("DESTRUCTIVE OPERATION: Deleting all countries and holidays");
    
    // Clear people's country_id references
    sqlx::query("UPDATE people SET country_id = NULL")
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to clear people country references: {}", e);
            e.to_string()
        })?;
    
    // Delete all countries (CASCADE will delete all holidays)
    sqlx::query("DELETE FROM countries")
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete countries: {}", e);
            e.to_string()
        })?;
    
    info!("Successfully deleted all countries and holidays");
    Ok(())
}

