// Import all command modules
mod absences;
mod assignments;
mod capacity;
mod countries;
mod holidays;
mod jobs;
mod optimization;
mod people;
mod planning_periods;
mod projects;
mod requirements;

// Re-export all commands for lib.rs
pub use absences::*;
pub use assignments::*;
pub use capacity::*;
pub use countries::*;
pub use holidays::*;
pub use jobs::*;
pub use optimization::*;
pub use people::*;
pub use planning_periods::*;
pub use projects::*;
pub use requirements::*;
