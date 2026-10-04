// Import production files directly. These aliases reproduce their crate paths,
// without importing main.rs, Tauri, config::db, backups or API keys.
#[path = "../../src/models/person.rs"]
pub mod person;
#[path = "../../src/repository/person_repository.rs"]
pub mod person_repository;
#[path = "../../src/services/person_service.rs"]
pub mod person_service;
#[path = "../../src/repository/sqlite_person_repository.rs"]
pub mod sqlite_person_repository;

pub mod models {
    pub use crate::person;
}
pub mod repository {
    pub use crate::person_repository;
}

#[cfg(test)]
mod people;
