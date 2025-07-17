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
    let db_path_str = match db_path.to_str() {
        Some(path) => path,
        None => {
            eprintln!("Warning: Failed to convert database path to string");
            return (
                PersonService::new(Arc::new(SqlitePersonRepository::new_dummy())),
                ExerciseService::new(Arc::new(SqliteExerciseRepository::new_dummy())),
                WorkoutEntryService::new(Arc::new(SqliteWorkoutEntryRepository::new_dummy())),
                RoutineService::new(Arc::new(SqliteRoutineRepository::new_dummy())),
            );
        }
    };

    // Run database migrations if needed
    if let Err(e) = run_database_migrations(db_path_str) {
        eprintln!("Warning: Database migration failed: {}", e);
        // Continue anyway, the app should still work
    }

    // Create repositories with error handling
    let person_repository = match SqlitePersonRepository::new_safe(db_path_str) {
        Ok(repo) => Arc::new(repo),
        Err(e) => {
            eprintln!("Warning: Failed to create person repository: {}", e);
            // Create a dummy repository that returns empty results
            Arc::new(SqlitePersonRepository::new_dummy())
        }
    };

    let exercise_repository = match SqliteExerciseRepository::new_safe(db_path_str) {
        Ok(repo) => Arc::new(repo),
        Err(e) => {
            eprintln!("Warning: Failed to create exercise repository: {}", e);
            Arc::new(SqliteExerciseRepository::new_dummy())
        }
    };

    let workout_entry_repository = match SqliteWorkoutEntryRepository::new_safe(db_path_str) {
        Ok(repo) => Arc::new(repo),
        Err(e) => {
            eprintln!("Warning: Failed to create workout entry repository: {}", e);
            Arc::new(SqliteWorkoutEntryRepository::new_dummy())
        }
    };

    let routine_repository = match SqliteRoutineRepository::new_safe(db_path_str) {
        Ok(repo) => Arc::new(repo),
        Err(e) => {
            eprintln!("Warning: Failed to create routine repository: {}", e);
            Arc::new(SqliteRoutineRepository::new_dummy())
        }
    };

    // Create services
    let person_service = PersonService::new(person_repository);
    let exercise_service = ExerciseService::new(exercise_repository);
    let workout_entry_service = WorkoutEntryService::new(workout_entry_repository);
    let routine_service = RoutineService::new(routine_repository);

    (person_service, exercise_service, workout_entry_service, routine_service)
}

pub fn get_database_path() -> PathBuf {
    // Check if we're in development mode
    let current_dir = match env::current_dir() {
        Ok(dir) => dir,
        Err(_) => {
            eprintln!("Warning: Failed to get current directory, using fallback");
            return PathBuf::from("data/gym_app.db");
        }
    };
    
    if current_dir.file_name().map(|name| name == "src-tauri").unwrap_or(false) {
        // Development mode: use project data directory
        let data_dir = current_dir.parent().unwrap_or(&current_dir).join("data");
        if let Err(e) = std::fs::create_dir_all(&data_dir) {
            eprintln!("Warning: Failed to create data directory: {}", e);
        }
        data_dir.join("gym_app.db")
    } else {
        // Production mode: use system app data directory
        // This ensures the database persists between app updates
        let app_data_dir = get_app_data_directory();
        if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
            eprintln!("Warning: Failed to create app data directory: {}", e);
        }
        app_data_dir.join("gym_app.db")
    }
}

fn get_app_data_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = match env::var("APPDATA") {
            Ok(path) => path,
            Err(_) => {
                eprintln!("Warning: APPDATA environment variable not found, using fallback");
                return PathBuf::from("data");
            }
        };
        PathBuf::from(appdata).join("QualityGym")
    }
    
    #[cfg(target_os = "macos")]
    {
        let home = match env::var("HOME") {
            Ok(path) => path,
            Err(_) => {
                eprintln!("Warning: HOME environment variable not found, using fallback");
                return PathBuf::from("data");
            }
        };
        PathBuf::from(home).join("Library").join("Application Support").join("QualityGym")
    }
    
    #[cfg(target_os = "linux")]
    {
        let home = match env::var("HOME") {
            Ok(path) => path,
            Err(_) => {
                eprintln!("Warning: HOME environment variable not found, using fallback");
                return PathBuf::from("data");
            }
        };
        PathBuf::from(home).join(".config").join("quality-gym")
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        // Fallback for other platforms
        let current_dir = match env::current_dir() {
            Ok(dir) => dir,
            Err(_) => {
                eprintln!("Warning: Failed to get current directory, using fallback");
                return PathBuf::from("data");
            }
        };
        current_dir.join("data")
    }
}

fn run_database_migrations(db_path: &str) -> Result<(), rusqlite::Error> {
    let conn = Connection::open(db_path)?;

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
        return Err(e);
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
    Ok(())
}
