use crate::database_migrations::{migrate_database, CURRENT_SCHEMA_VERSION};
use crate::sqlite_exercise_repository::SqliteExerciseRepository;
use crate::sqlite_person_repository::SqlitePersonRepository;
use crate::sqlite_routine_repository::SqliteRoutineRepository;
use crate::sqlite_workout_entry_repository::SqliteWorkoutEntryRepository;
use crate::exercise::Exercise;
use crate::exercise_service::ExerciseService;
use crate::person::Person;
use crate::person_service::PersonService;
use crate::routine_service::RoutineService;
use crate::workout_entry::WorkoutEntry;
use crate::workout_entry_service::WorkoutEntryService;
use rusqlite::Connection;
use std::sync::Arc;
use tempfile::{Builder, TempDir};

struct Fixture {
    directory: TempDir,
    path: std::path::PathBuf,
}

impl Fixture {
    fn new() -> Self {
        let directory = Builder::new().prefix("gym-migration-tests-").tempdir().unwrap();
        let path = directory.path().join("gym.sqlite");
        Self { directory, path }
    }

    fn connection(&self) -> Connection {
        Connection::open(&self.path).unwrap()
    }
}

fn column_exists(connection: &Connection, table: &str, column: &str) -> bool {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table})"))
        .unwrap();
    let found = statement
        .query_map([], |row| row.get::<_, String>(1))
        .unwrap()
        .any(|candidate| candidate.unwrap() == column);
    found
}

fn create_legacy_database(fixture: &Fixture) {
    fixture
        .connection()
        .execute_batch(
            "CREATE TABLE people (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT NOT NULL
            );
            CREATE TABLE exercise (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE
            );
            CREATE TABLE workout_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                sets INTEGER,
                reps INTEGER,
                weight REAL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE routines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE routine_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                routine_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0,
                sets INTEGER,
                reps INTEGER,
                weight REAL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(routine_id, exercise_id)
            );
            INSERT INTO people (id, name, last_name, phone) VALUES (7, 'Ada', 'Lovelace', '123');
            INSERT INTO exercise (id, name, code) VALUES (11, 'Sentadilla', 'SQ');
            INSERT INTO workout_entries (id, person_id, exercise_id, date, sets, reps, weight, notes)
                VALUES (13, 7, 11, '2026-09-30', 3, 8, 70, 'histórico');
            INSERT INTO routines (id, name, code) VALUES (17, 'Fuerza', 'F1');
            INSERT INTO routine_exercises (id, routine_id, exercise_id, order_index, sets, reps, weight)
                VALUES (19, 17, 11, 0, 3, 8, 70);",
        )
        .unwrap();
}

#[test]
fn fresh_install_creates_the_complete_versioned_schema() {
    let fixture = Fixture::new();
    let outcome = migrate_database(&fixture.path).unwrap();
    assert_eq!(outcome.current_version, CURRENT_SCHEMA_VERSION);
    assert!(outcome.backup_path.is_none());

    let connection = fixture.connection();
    let version: i32 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .unwrap();
    assert_eq!(version, CURRENT_SCHEMA_VERSION);
    assert!(column_exists(&connection, "workout_entries", "group_number"));
    assert!(column_exists(&connection, "routine_exercises", "group_number"));
}

#[test]
fn legacy_database_is_backed_up_and_migrated_without_losing_records() {
    let fixture = Fixture::new();
    create_legacy_database(&fixture);

    let outcome = migrate_database(&fixture.path).unwrap();
    let backup_path = outcome.backup_path.unwrap();
    assert!(backup_path.exists());
    assert!(column_exists(&Connection::open(&backup_path).unwrap(), "people", "name"));

    let connection = fixture.connection();
    assert!(column_exists(&connection, "people", "is_active"));
    assert!(column_exists(&connection, "exercise", "deleted_at"));
    assert!(column_exists(&connection, "workout_entries", "order_index"));
    assert!(column_exists(&connection, "workout_entries", "group_number"));
    assert!(column_exists(&connection, "routine_exercises", "group_number"));
    let preserved: (i32, i32, i32, i32, String) = connection
        .query_row(
            "SELECT p.id, e.id, w.id, r.id, w.date
             FROM people p, exercise e, workout_entries w, routines r
             WHERE p.id = 7 AND e.id = 11 AND w.id = 13 AND r.id = 17",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .unwrap();
    assert_eq!(preserved, (7, 11, 13, 17, "2026-09-30".into()));
    let defaults: (i32, i32, i32) = connection
        .query_row(
            "SELECT order_index, group_number, (SELECT group_number FROM routine_exercises WHERE id = 19)
             FROM workout_entries WHERE id = 13",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    assert_eq!(defaults, (0, 1, 1));

    let path = fixture.path.to_str().unwrap();
    SqlitePersonRepository::new_safe(path).unwrap();
    SqliteExerciseRepository::new_safe(path).unwrap();
    SqliteWorkoutEntryRepository::new_safe(path).unwrap();
    SqliteRoutineRepository::new_safe(path).unwrap();
    assert!(column_exists(&fixture.connection(), "workout_entries", "group_number"));
}

#[test]
fn reopening_an_updated_database_is_idempotent_and_does_not_replace_backup() {
    let fixture = Fixture::new();
    create_legacy_database(&fixture);
    let first = migrate_database(&fixture.path).unwrap();
    let backup = first.backup_path.unwrap();
    let original_backup = std::fs::read(&backup).unwrap();

    let second = migrate_database(&fixture.path).unwrap();
    assert_eq!(second.previous_version, CURRENT_SCHEMA_VERSION);
    assert!(second.backup_path.is_none());
    assert_eq!(std::fs::read(backup).unwrap(), original_backup);
    let count: i32 = fixture
        .connection()
        .query_row("SELECT COUNT(*) FROM workout_entries", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn incompatible_partial_schema_fails_and_rolls_back_version_change() {
    let fixture = Fixture::new();
    fixture
        .connection()
        .execute_batch("CREATE TABLE people (id INTEGER PRIMARY KEY, unexpected TEXT);")
        .unwrap();

    let error = migrate_database(&fixture.path).unwrap_err();
    assert!(error.contains("people.name"));
    let connection = fixture.connection();
    let version: i32 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .unwrap();
    assert_eq!(version, 0);
    assert!(!column_exists(&connection, "people", "is_active"));
}

#[test]
fn database_from_a_newer_app_version_is_rejected_without_changes() {
    let fixture = Fixture::new();
    let connection = fixture.connection();
    connection
        .execute_batch("CREATE TABLE sentinel (value TEXT); INSERT INTO sentinel VALUES ('keep'); PRAGMA user_version = 99;")
        .unwrap();
    drop(connection);

    let error = migrate_database(&fixture.path).unwrap_err();
    assert!(error.contains("esquema 99"));
    let value: String = fixture
        .connection()
        .query_row("SELECT value FROM sentinel", [], |row| row.get(0))
        .unwrap();
    assert_eq!(value, "keep");
}

#[test]
fn migration_fixture_is_removed_after_the_test() {
    let fixture = Fixture::new();
    let directory = fixture.directory.path().to_owned();
    migrate_database(&fixture.path).unwrap();
    drop(fixture);
    assert!(!directory.exists());
}

#[test]
fn complete_domain_data_survives_service_shutdown_and_reopen() {
    let fixture = Fixture::new();
    migrate_database(&fixture.path).unwrap();
    let path = fixture.path.to_str().unwrap();

    let people = PersonService::new(Arc::new(SqlitePersonRepository::new_safe(path).unwrap()));
    let exercises = ExerciseService::new(Arc::new(SqliteExerciseRepository::new_safe(path).unwrap()));
    let workouts = WorkoutEntryService::new(Arc::new(SqliteWorkoutEntryRepository::new_safe(path).unwrap()));
    let routines = RoutineService::new(Arc::new(SqliteRoutineRepository::new_safe(path).unwrap()));

    people
        .create_person(Person {
            id: None,
            name: "Ana".into(),
            last_name: "Pérez".into(),
            phone: "3511234567".into(),
        })
        .unwrap();
    exercises
        .create_exercise(Exercise {
            id: None,
            name: "Sentadilla".into(),
            code: "SQ".into(),
        })
        .unwrap();
    let connection = fixture.connection();
    let person_id: i32 = connection.query_row("SELECT id FROM people", [], |row| row.get(0)).unwrap();
    let exercise_id: i32 = connection.query_row("SELECT id FROM exercise", [], |row| row.get(0)).unwrap();
    drop(connection);
    workouts
        .create_workout_session(vec![WorkoutEntry {
            id: None,
            person_id,
            exercise_id,
            date: "2026-10-04".into(),
            sets: Some(4),
            reps: Some(6),
            weight: Some(80.0),
            notes: Some("persistente".into()),
            order_index: Some(0),
            group_number: Some(1),
            created_at: None,
            updated_at: None,
        }])
        .unwrap();
    let routine_id = routines
        .create_routine_from_workout(
            "Día A".into(),
            "A".into(),
            vec![(exercise_id, Some(4), Some(6), Some(80.0), None, Some(1))],
        )
        .unwrap();
    drop((people, exercises, workouts, routines));

    migrate_database(&fixture.path).unwrap();
    let reopened_people = PersonService::new(Arc::new(SqlitePersonRepository::new_safe(path).unwrap()));
    let reopened_workouts = WorkoutEntryService::new(Arc::new(SqliteWorkoutEntryRepository::new_safe(path).unwrap()));
    let reopened_routines = RoutineService::new(Arc::new(SqliteRoutineRepository::new_safe(path).unwrap()));

    assert_eq!(reopened_people.list_people().unwrap()[0].id, Some(person_id));
    let saved_workout = &reopened_workouts.get_workout_entries_by_person(person_id).unwrap()[0];
    assert_eq!((saved_workout.exercise_id, saved_workout.date.as_str()), (exercise_id, "2026-10-04"));
    assert_eq!(
        reopened_routines
            .get_routine_with_exercises(routine_id)
            .unwrap()
            .unwrap()
            .exercises
            .len(),
        1
    );
}
