use std::sync::Arc;
use std::env;
use std::path::PathBuf;
use crate::repository::sqlite_person_repository::SqlitePersonRepository;
use crate::repository::sqlite_exercise_repository::SqliteExerciseRepository;
use crate::repository::sqlite_workout_entry_repository::SqliteWorkoutEntryRepository;
use crate::repository::sqlite_routine_repository::SqliteRoutineRepository;
use crate::services::person_service::PersonService;
use crate::services::exercise_service::ExerciseService;
use crate::services::workout_entry_service::WorkoutEntryService;
use crate::services::routine_service::RoutineService;

pub fn setup_services() -> (PersonService, ExerciseService, WorkoutEntryService, RoutineService) {
    // Get the current directory and create a data folder
    let current_dir = env::current_dir().expect("Failed to get current directory");
    let data_dir = current_dir.join("data");
    
    // Create the data directory if it doesn't exist
    std::fs::create_dir_all(&data_dir).expect("Failed to create data directory");
    
    // Set the database path in the data directory
    let db_path = data_dir.join("gym_app.db");
    let db_path_str = db_path.to_str().expect("Failed to convert path to string");

    // Create repositories
    let person_repository = Arc::new(SqlitePersonRepository::new(db_path_str));
    let exercise_repository = Arc::new(SqliteExerciseRepository::new(db_path_str));
    let workout_entry_repository = Arc::new(SqliteWorkoutEntryRepository::new(db_path_str));
    let routine_repository = Arc::new(SqliteRoutineRepository::new(db_path_str));

    // Create services
    let person_service = PersonService::new(person_repository);
    let exercise_service = ExerciseService::new(exercise_repository);
    let workout_entry_service = WorkoutEntryService::new(workout_entry_repository);
    let routine_service = RoutineService::new(routine_repository);

    (person_service, exercise_service, workout_entry_service, routine_service)
}
