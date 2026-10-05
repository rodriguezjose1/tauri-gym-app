use rusqlite::{Connection, OptionalExtension};
use std::fs;
use std::path::{Path, PathBuf};

pub const CURRENT_SCHEMA_VERSION: i32 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MigrationOutcome {
    pub previous_version: i32,
    pub current_version: i32,
    pub backup_path: Option<PathBuf>,
}

pub fn migrate_database(db_path: &Path) -> Result<MigrationOutcome, String> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("No se pudo crear el directorio de datos: {error}"))?;
    }

    let existed_with_data = db_path.metadata().map(|metadata| metadata.len() > 0).unwrap_or(false);
    let previous_version = if existed_with_data {
        let connection = Connection::open(db_path)
            .map_err(|error| format!("No se pudo abrir la base existente: {error}"))?;
        let version = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(|error| format!("No se pudo leer la versión de la base: {error}"))?;
        connection
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|error| format!("No se pudo consolidar la base antes del respaldo: {error}"))?;
        version
    } else {
        0
    };

    if previous_version > CURRENT_SCHEMA_VERSION {
        return Err(format!(
            "La base usa el esquema {previous_version}, pero esta aplicación soporta hasta {CURRENT_SCHEMA_VERSION}"
        ));
    }

    let backup_path = if existed_with_data && previous_version < CURRENT_SCHEMA_VERSION {
        Some(create_pre_migration_backup(db_path, previous_version)?)
    } else {
        None
    };

    let mut connection = Connection::open(db_path)
        .map_err(|error| format!("No se pudo abrir la base de datos: {error}"))?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")
        .map_err(|error| format!("No se pudo configurar SQLite: {error}"))?;

    let integrity: String = connection
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|error| format!("No se pudo validar la base de datos: {error}"))?;
    if integrity != "ok" {
        return Err(format!("La base de datos no superó la validación de integridad: {integrity}"));
    }

    if previous_version < CURRENT_SCHEMA_VERSION {
        migrate_to_v1(&mut connection)?;
    }

    validate_schema(&connection)?;
    Ok(MigrationOutcome {
        previous_version,
        current_version: CURRENT_SCHEMA_VERSION,
        backup_path,
    })
}

fn create_pre_migration_backup(db_path: &Path, version: i32) -> Result<PathBuf, String> {
    let file_name = db_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("La ruta de la base de datos no tiene un nombre válido")?;
    let backup_path = db_path.with_file_name(format!("{file_name}.pre-migration-v{version}.bak"));
    if !backup_path.exists() {
        fs::copy(db_path, &backup_path)
            .map_err(|error| format!("No se pudo crear el respaldo previo a la migración: {error}"))?;
    }
    Ok(backup_path)
}

fn migrate_to_v1(connection: &mut Connection) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la migración: {error}"))?;

    transaction
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS people (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                deleted_at DATETIME NULL,
                is_active BOOLEAN DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS exercise (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                deleted_at DATETIME NULL,
                is_active BOOLEAN DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS routines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME NULL,
                is_active INTEGER DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS workout_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                date DATE NOT NULL,
                sets INTEGER,
                reps INTEGER,
                weight REAL,
                notes TEXT,
                order_index INTEGER DEFAULT 0,
                group_number INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercise (id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS routine_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                routine_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0,
                sets INTEGER,
                reps INTEGER,
                weight REAL,
                notes TEXT,
                group_number INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercise (id) ON DELETE CASCADE,
                UNIQUE(routine_id, exercise_id)
            );
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
        )
        .map_err(|error| format!("No se pudieron crear las tablas base: {error}"))?;

    for (table, column, definition) in [
        ("people", "deleted_at", "deleted_at DATETIME NULL"),
        ("people", "is_active", "is_active BOOLEAN DEFAULT 1"),
        ("exercise", "deleted_at", "deleted_at DATETIME NULL"),
        ("exercise", "is_active", "is_active BOOLEAN DEFAULT 1"),
        ("routines", "deleted_at", "deleted_at DATETIME NULL"),
        ("routines", "is_active", "is_active INTEGER DEFAULT 1"),
        ("workout_entries", "order_index", "order_index INTEGER DEFAULT 0"),
        ("workout_entries", "group_number", "group_number INTEGER DEFAULT 1"),
        ("routine_exercises", "group_number", "group_number INTEGER DEFAULT 1"),
    ] {
        if !column_exists(&transaction, table, column)? {
            transaction
                .execute_batch(&format!("ALTER TABLE {table} ADD COLUMN {definition};"))
                .map_err(|error| format!("No se pudo agregar {table}.{column}: {error}"))?;
        }
    }

    transaction
        .execute_batch(
            "UPDATE people SET is_active = 1 WHERE is_active IS NULL;
             UPDATE exercise SET is_active = 1 WHERE is_active IS NULL;
             UPDATE routines SET is_active = 1 WHERE is_active IS NULL;
             UPDATE workout_entries SET order_index = 0 WHERE order_index IS NULL;
             UPDATE workout_entries SET group_number = 1 WHERE group_number IS NULL;
             UPDATE routine_exercises SET group_number = 1 WHERE group_number IS NULL;
             CREATE INDEX IF NOT EXISTS idx_workout_entries_person_date ON workout_entries (person_id, date);
             CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON routine_exercises (routine_id);
             CREATE INDEX IF NOT EXISTS idx_routine_exercises_order ON routine_exercises (routine_id, order_index);
             INSERT OR IGNORE INTO migrations (version) VALUES ('001_canonical_schema');
             PRAGMA user_version = 1;",
        )
        .map_err(|error| format!("No se pudo finalizar la migración: {error}"))?;

    validate_schema(&transaction)?;

    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar la migración: {error}"))
}

fn column_exists(connection: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|error| error.to_string())?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?;
    for candidate in columns {
        if candidate.map_err(|error| error.to_string())? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn validate_schema(connection: &Connection) -> Result<(), String> {
    for (table, columns) in [
        ("people", &["id", "name", "last_name", "phone", "deleted_at", "is_active"][..]),
        ("exercise", &["id", "name", "code", "deleted_at", "is_active"][..]),
        ("routines", &["id", "name", "code", "deleted_at", "is_active"][..]),
        ("workout_entries", &["id", "person_id", "exercise_id", "date", "order_index", "group_number"][..]),
        ("routine_exercises", &["id", "routine_id", "exercise_id", "order_index", "group_number"][..]),
    ] {
        let exists: Option<i32> = connection
            .query_row(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1",
                [table],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        if exists.is_none() {
            return Err(format!("La tabla requerida '{table}' no existe"));
        }
        for column in columns {
            if !column_exists(connection, table, column)? {
                return Err(format!("Falta la columna requerida {table}.{column}"));
            }
        }
    }

    let foreign_key_error: Option<String> = connection
        .query_row("PRAGMA foreign_key_check", [], |row| {
            Ok(format!("{}:{}", row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some(error) = foreign_key_error {
        return Err(format!("Se encontraron relaciones inválidas en {error}"));
    }
    Ok(())
}
