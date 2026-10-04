use crate::models::exercise::Exercise;
use crate::repository::exercise_repository::ExerciseRepository;
use rusqlite::{params, Connection, Result as SqliteResult};

pub struct SqliteExerciseRepository {
    db_path: String,
    is_dummy: bool,
}

impl SqliteExerciseRepository {
    pub fn new(db_path: &str) -> Self {
        Self::new_safe(db_path).expect("Failed to create exercise table")
    }

    pub fn new_safe(db_path: &str) -> Result<Self, String> {
        let repo = Self {
            db_path: db_path.into(),
            is_dummy: false,
        };
        repo.create_table()
            .map_err(|e| format!("Failed to create exercise table: {e}"))?;
        Ok(repo)
    }

    pub fn new_dummy() -> Self {
        Self {
            db_path: String::new(),
            is_dummy: true,
        }
    }

    fn create_table(&self) -> SqliteResult<()> {
        if self.is_dummy {
            return Ok(());
        }
        let conn = Connection::open(&self.db_path)?;
        if self.logical_deletion_migration_needed(&conn)? {
            conn.execute(
                "ALTER TABLE exercise ADD COLUMN deleted_at DATETIME NULL",
                [],
            )?;
            conn.execute(
                "ALTER TABLE exercise ADD COLUMN is_active BOOLEAN DEFAULT 1",
                [],
            )?;
        } else {
            conn.execute(
                "CREATE TABLE IF NOT EXISTS exercise (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    code TEXT NOT NULL UNIQUE,
                    deleted_at DATETIME NULL,
                    is_active BOOLEAN DEFAULT 1
                )",
                [],
            )?;
        }
        Ok(())
    }

    fn logical_deletion_migration_needed(&self, conn: &Connection) -> SqliteResult<bool> {
        let sql = conn.query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='exercise'",
            [],
            |row| row.get::<_, String>(0),
        );
        match sql {
            Ok(sql) => Ok(!sql.contains("deleted_at") && !sql.contains("is_active")),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
            Err(error) => Err(error),
        }
    }

    fn connection(&self) -> Result<Connection, String> {
        if self.is_dummy {
            return Err("Exercise repository unavailable".into());
        }
        Connection::open(&self.db_path).map_err(|e| e.to_string())
    }

    fn map_exercise(row: &rusqlite::Row<'_>) -> rusqlite::Result<Exercise> {
        Ok(Exercise {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            code: row.get(2)?,
        })
    }

    fn query_list(
        &self,
        sql: &str,
        values: &[&dyn rusqlite::ToSql],
    ) -> Result<Vec<Exercise>, String> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(values, Self::map_exercise)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
}

impl ExerciseRepository for SqliteExerciseRepository {
    fn create(&self, exercise: Exercise) -> Result<(), String> {
        let conn = self.connection()?;
        conn.execute(
            "INSERT INTO exercise (name, code) VALUES (?1, ?2)",
            params![exercise.name, exercise.code],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn list(&self) -> Result<Vec<Exercise>, String> {
        self.query_list(
            "SELECT id, name, code FROM exercise
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name",
            &[],
        )
    }

    fn list_paginated(&self, page: i32, page_size: i32) -> Result<Vec<Exercise>, String> {
        let offset = (page - 1)
            .checked_mul(page_size)
            .ok_or("Pagination overflow")?;
        self.query_list(
            "SELECT id, name, code FROM exercise
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name LIMIT ?1 OFFSET ?2",
            &[&page_size, &offset],
        )
    }

    fn count(&self) -> Result<i32, String> {
        self.connection()?.query_row(
            "SELECT COUNT(*) FROM exercise WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)",
            [], |row| row.get(0),
        ).map_err(|e| e.to_string())
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        let changed = self.connection()?.execute(
            "UPDATE exercise SET deleted_at = datetime('now'), is_active = 0 WHERE id = ?1 AND (is_active = 1 OR is_active IS NULL)", [id],
        ).map_err(|e| e.to_string())?;
        if changed == 0 {
            Err("Active exercise not found".into())
        } else {
            Ok(())
        }
    }

    fn restore(&self, id: i32) -> Result<(), String> {
        let changed = self.connection()?.execute(
            "UPDATE exercise SET deleted_at = NULL, is_active = 1 WHERE id = ?1 AND is_active = 0", [id],
        ).map_err(|e| e.to_string())?;
        if changed == 0 {
            Err("Deleted exercise not found".into())
        } else {
            Ok(())
        }
    }

    fn update(&self, exercise: Exercise) -> Result<(), String> {
        let changed = self
            .connection()?
            .execute(
                "UPDATE exercise SET name = ?1, code = ?2 WHERE id = ?3",
                params![exercise.name, exercise.code, exercise.id],
            )
            .map_err(|e| e.to_string())?;
        if changed == 0 {
            Err("Exercise not found".into())
        } else {
            Ok(())
        }
    }

    fn search_paginated(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<Vec<Exercise>, String> {
        let offset = (page - 1)
            .checked_mul(page_size)
            .ok_or("Pagination overflow")?;
        let pattern = format!("%{query}%");
        self.query_list(
            "SELECT id, name, code FROM exercise
             WHERE (name LIKE ?1 OR code LIKE ?1)
             AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name LIMIT ?2 OFFSET ?3",
            &[&pattern, &page_size, &offset],
        )
    }

    fn search_count(&self, query: &str) -> Result<i32, String> {
        let pattern = format!("%{query}%");
        self.connection()?
            .query_row(
                "SELECT COUNT(*) FROM exercise WHERE (name LIKE ?1 OR code LIKE ?1)
             AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)",
                [pattern],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())
    }

    fn list_deleted(&self) -> Result<Vec<Exercise>, String> {
        self.query_list(
            "SELECT id, name, code FROM exercise WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0 ORDER BY deleted_at DESC",
            &[],
        )
    }

    fn count_deleted(&self) -> Result<i32, String> {
        self.connection()?.query_row(
            "SELECT COUNT(*) FROM exercise WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0",
            [], |row| row.get(0),
        ).map_err(|e| e.to_string())
    }
}
