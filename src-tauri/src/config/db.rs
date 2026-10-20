use crate::config::database_migrations::migrate_database;
use crate::repository::sqlite_exercise_repository::SqliteExerciseRepository;
use crate::repository::sqlite_person_repository::SqlitePersonRepository;
use crate::repository::sqlite_product_repository::SqliteProductRepository;
use crate::repository::sqlite_routine_repository::SqliteRoutineRepository;
use crate::repository::sqlite_workout_entry_repository::SqliteWorkoutEntryRepository;
use crate::services::billing_service::BillingService;
use crate::services::dashboard_service::DashboardService;
use crate::services::exercise_service::ExerciseService;
use crate::services::person_service::PersonService;
use crate::services::product_service::ProductService;
use crate::services::routine_service::RoutineService;
use crate::services::workout_entry_service::WorkoutEntryService;
use std::env;
use std::path::PathBuf;
use std::sync::Arc;

pub fn setup_services() -> Result<
    (
        PersonService,
        ExerciseService,
        WorkoutEntryService,
        RoutineService,
        BillingService,
        DashboardService,
        ProductService,
    ),
    String,
> {
    let db_path = get_database_path();
    let db_path_str = db_path
        .to_str()
        .ok_or("La ruta de la base de datos contiene caracteres no válidos")?;

    let outcome = migrate_database(&db_path)?;
    if let Some(path) = outcome.backup_path {
        println!(
            "Respaldo previo a la migración creado en {}",
            path.display()
        );
    }

    let person_repository = Arc::new(SqlitePersonRepository::new_safe(db_path_str)?);
    let exercise_repository = Arc::new(SqliteExerciseRepository::new_safe(db_path_str)?);
    let workout_entry_repository = Arc::new(SqliteWorkoutEntryRepository::new_safe(db_path_str)?);
    let routine_repository = Arc::new(SqliteRoutineRepository::new_safe(db_path_str)?);
    let product_repository = Arc::new(SqliteProductRepository::new_safe(db_path_str)?);

    // Create services
    let person_service = PersonService::new(person_repository);
    let exercise_service = ExerciseService::new(exercise_repository);
    let workout_entry_service = WorkoutEntryService::new(workout_entry_repository);
    let routine_service = RoutineService::new(routine_repository);
    let billing_service = BillingService::new(db_path_str);
    let dashboard_service = DashboardService::new(db_path_str);
    let product_service = ProductService::new(product_repository);

    Ok((
        person_service,
        exercise_service,
        workout_entry_service,
        routine_service,
        billing_service,
        dashboard_service,
        product_service,
    ))
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

    if current_dir
        .file_name()
        .map(|name| name == "src-tauri")
        .unwrap_or(false)
    {
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
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("QualityGym")
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
