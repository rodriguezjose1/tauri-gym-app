// Import production files directly. These aliases reproduce their crate paths,
// without importing main.rs, Tauri, config::db, backups or API keys.
#[path = "../../src/models/exercise.rs"]
pub mod exercise;
#[path = "../../src/repository/exercise_repository.rs"]
pub mod exercise_repository;
#[path = "../../src/services/exercise_service.rs"]
pub mod exercise_service;
#[path = "../../src/models/person.rs"]
pub mod person;
#[path = "../../src/repository/person_repository.rs"]
pub mod person_repository;
#[path = "../../src/services/person_service.rs"]
pub mod person_service;
#[path = "../../src/repository/sqlite_exercise_repository.rs"]
pub mod sqlite_exercise_repository;
#[path = "../../src/repository/sqlite_person_repository.rs"]
pub mod sqlite_person_repository;
#[path = "../../src/repository/sqlite_workout_entry_repository.rs"]
pub mod sqlite_workout_entry_repository;
#[path = "../../src/models/workout_entry.rs"]
pub mod workout_entry;
#[path = "../../src/repository/workout_entry_repository.rs"]
pub mod workout_entry_repository;
#[path = "../../src/services/workout_entry_service.rs"]
pub mod workout_entry_service;

pub mod models {
    pub use crate::exercise;
    pub use crate::person;
    pub use crate::workout_entry;
}
pub mod repository {
    pub use crate::exercise_repository;
    pub use crate::person_repository;
    pub use crate::workout_entry_repository;
}

#[cfg(test)]
mod exercises_workouts;
#[cfg(test)]
mod people;
