use serde::{Deserialize, Serialize};
use log::{info, error};

const NAGER_DATE_BASE_URL: &str = "https://date.nager.at/api/v3";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NagerDateCountry {
    pub country_code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NagerDateHoliday {
    pub date: String,
    pub local_name: String,
    pub name: String,
    pub country_code: String,
    pub global: bool,
    pub types: Vec<String>,
}

/// Fetches the list of available countries from Nager.Date API
pub async fn fetch_available_countries() -> Result<Vec<NagerDateCountry>, String> {
    info!("Fetching available countries from Nager.Date API");
    
    let url = format!("{}/AvailableCountries", NAGER_DATE_BASE_URL);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| {
            error!("Failed to fetch available countries: {}", e);
            format!("Network error: {}", e)
        })?;
    
    if !response.status().is_success() {
        let status = response.status();
        error!("API returned error status: {}", status);
        return Err(format!("API error: {}", status));
    }
    
    let countries = response
        .json::<Vec<NagerDateCountry>>()
        .await
        .map_err(|e| {
            error!("Failed to parse countries response: {}", e);
            format!("Parse error: {}", e)
        })?;
    
    info!("Successfully fetched {} countries", countries.len());
    Ok(countries)
}

/// Fetches public holidays for a specific country and year
pub async fn fetch_public_holidays(country_code: &str, year: i32) -> Result<Vec<NagerDateHoliday>, String> {
    info!("Fetching public holidays for {} in {}", country_code, year);
    
    let url = format!("{}/PublicHolidays/{}/{}", NAGER_DATE_BASE_URL, year, country_code);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| {
            error!("Failed to fetch holidays for {} ({}): {}", country_code, year, e);
            format!("Network error: {}", e)
        })?;
    
    if !response.status().is_success() {
        let status = response.status();
        error!("API returned error status for {} ({}): {}", country_code, year, status);
        return Err(format!("API error: {}", status));
    }
    
    let holidays = response
        .json::<Vec<NagerDateHoliday>>()
        .await
        .map_err(|e| {
            error!("Failed to parse holidays response for {} ({}): {}", country_code, year, e);
            format!("Parse error: {}", e)
        })?;
    
    info!("Successfully fetched {} holidays for {} ({})", holidays.len(), country_code, year);
    Ok(holidays)
}
