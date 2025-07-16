use std::sync::Arc;
use std::env;
use std::path::PathBuf;
use rusqlite::Connection;
use crate::repository::sqlite_person_repository::SqlitePersonRepository;
use crate::repository::sqlite_exercise_repository::SqliteExerciseRepository;
use crate::repository::sqlite_workout_entry_repository::SqliteWorkoutEntryRepository;
use crate::repository::sqlite_routine_repository::SqliteRoutineRepository;
use crate::services::person_service::PersonService;
use crate::services::exercise_service::ExerciseService;
use crate::services::workout_entry_service::WorkoutEntryService;
use crate::services::routine_service::RoutineService;

pub fn setup_services() -> (PersonService, ExerciseService, WorkoutEntryService, RoutineService) {
    let db_path = get_database_path();
    let db_path_str = db_path.to_str().expect("Failed to convert path to string");

    // Run database migrations if needed
    run_database_migrations(db_path_str);

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

fn get_database_path() -> PathBuf {
    // Check if we're in development mode
    let current_dir = env::current_dir().expect("Failed to get current directory");
    
    if current_dir.file_name().unwrap() == "src-tauri" {
        // Development mode: use project data directory
        let data_dir = current_dir.parent().unwrap().join("data");
        std::fs::create_dir_all(&data_dir).expect("Failed to create data directory");
        data_dir.join("gym_app.db")
    } else {
        // Production mode: use system app data directory
        // This ensures the database persists between app updates
        let app_data_dir = get_app_data_directory();
        std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
        app_data_dir.join("gym_app.db")
    }
}

fn get_app_data_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = env::var("APPDATA").expect("APPDATA environment variable not found");
        PathBuf::from(appdata).join("QualityGym")
    }
    
    #[cfg(target_os = "macos")]
    {
        let home = env::var("HOME").expect("HOME environment variable not found");
        PathBuf::from(home).join("Library").join("Application Support").join("QualityGym")
    }
    
    #[cfg(target_os = "linux")]
    {
        let home = env::var("HOME").expect("HOME environment variable not found");
        PathBuf::from(home).join(".config").join("quality-gym")
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        // Fallback for other platforms
        let current_dir = env::current_dir().expect("Failed to get current directory");
        current_dir.join("data")
    }
}

fn run_database_migrations(db_path: &str) {
    let conn = match Connection::open(db_path) {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("Failed to open database for migrations: {}", e);
            return;
        }
    };

    // Create migrations table if it doesn't exist
    if let Err(e) = conn.execute(
        "CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ) {
        eprintln!("Failed to create migrations table: {}", e);
        return;
    }

    // No migrations needed for initial version
    // Add future migrations here when needed:
    // let migrations = vec![
    //     ("001_add_new_column", "ALTER TABLE table_name ADD COLUMN new_column TEXT"),
    // ];
    
    // Uncomment the following code when you need to add migrations:
    // for (version, sql) in migrations {
    //     // Check if migration already applied
    //     let applied = conn.query_row(
    //         "SELECT COUNT(*) FROM migrations WHERE version = ?",
    //         [version],
    //         |row| row.get::<_, i32>(0),
    //     ).unwrap_or(0) > 0;
    //
    //     if !applied {
    //         // Apply migration
    //         if let Err(e) = conn.execute(sql, []) {
    //             eprintln!("Failed to apply migration {}: {}", version, e);
    //             continue;
    //         }
    //
    //         // Record migration as applied
    //         if let Err(e) = conn.execute(
    //             "INSERT INTO migrations (version) VALUES (?)",
    //             [version],
    //         ) {
    //             eprintln!("Failed to record migration {}: {}", version, e);
    //         } else {
    //             println!("Applied migration: {}", version);
    //         }
    //     }
    // }
}
