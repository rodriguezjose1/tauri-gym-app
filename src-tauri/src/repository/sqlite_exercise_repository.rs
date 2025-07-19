use crate::models::exercise::Exercise;
use crate::repository::exercise_repository::ExerciseRepository;
use rusqlite::{Connection, params, Result as SqliteResult};

pub struct SqliteExerciseRepository {
    db_path: String,
    is_dummy: bool,
}

impl SqliteExerciseRepository {
    pub fn new(db_path: &str) -> Self {
        let repo = Self {
            db_path: db_path.to_string(),
            is_dummy: false,
        };
        repo.create_table().expect("Failed to create exercise table");
        repo
    }

    pub fn new_safe(db_path: &str) -> Result<Self, String> {
        let repo = Self {
            db_path: db_path.to_string(),
            is_dummy: false,
        };
        repo.create_table().map_err(|e| format!("Failed to create exercise table: {}", e))?;
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
        
        // Check if logical deletion migration is needed
        if self.check_if_logical_deletion_migration_needed(&conn)? {
            self.migrate_logical_deletion(&conn)?;
        } else {
            // Create new table with logical deletion fields
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

    fn check_if_logical_deletion_migration_needed(&self, conn: &Connection) -> SqliteResult<bool> {
        if self.is_dummy { return Ok(false); }
        
        // Check if table exists but doesn't have logical deletion fields
        let mut stmt = conn.prepare(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='exercise'"
        )?;
        
        let table_sql: Result<String, _> = stmt.query_row([], |row| {
            Ok(row.get::<_, String>(0)?)
        });
        
        match table_sql {
            Ok(sql) => Ok(!sql.contains("deleted_at") && !sql.contains("is_active")),
            Err(_) => Ok(false), // Table doesn't exist, no migration needed
        }
    }

    fn migrate_logical_deletion(&self, conn: &Connection) -> SqliteResult<()> {
        if self.is_dummy { return Ok(()); }
        println!("Adding logical deletion fields to exercise table...");
        
        // Add logical deletion columns
        conn.execute(
            "ALTER TABLE exercise ADD COLUMN deleted_at DATETIME NULL",
            [],
        )?;
        
        conn.execute(
            "ALTER TABLE exercise ADD COLUMN is_active BOOLEAN DEFAULT 1",
            [],
        )?;
        
        println!("Logical deletion migration completed successfully!");
        Ok(())
    }

    fn get_connection(&self) -> SqliteResult<Connection> {
        if self.is_dummy {
            return Err(rusqlite::Error::InvalidQuery);
        }
        Connection::open(&self.db_path)
    }
}

impl ExerciseRepository for SqliteExerciseRepository {
    fn create(&self, exercise: Exercise) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }
        
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO exercise (name, code) VALUES (?1, ?2)",
            params![exercise.name, exercise.code],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn list(&self) -> Vec<Exercise> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code FROM exercise 
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };
        
        let exercise_iter = match stmt.query_map([], |row| {
            Ok(Exercise {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        exercise_iter.filter_map(|exercise| exercise.ok()).collect()
    }

    fn list_paginated(&self, page: i32, page_size: i32) -> Vec<Exercise> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let offset = (page - 1) * page_size;
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code FROM exercise 
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name
             LIMIT ?1 OFFSET ?2"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let exercise_iter = match stmt.query_map(params![page_size, offset], |row| {
            Ok(Exercise {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        exercise_iter.filter_map(|exercise| exercise.ok()).collect()
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }
        
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Logical deletion instead of physical deletion
        conn.execute(
            "UPDATE exercise SET deleted_at = datetime('now'), is_active = 0 WHERE id = ?1",
            params![id]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn restore(&self, id: i32) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }
        
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Restore logically deleted exercise
        conn.execute(
            "UPDATE exercise SET deleted_at = NULL, is_active = 1 WHERE id = ?1",
            params![id]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn update(&self, exercise: Exercise) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }
        
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE exercise SET name = ?1, code = ?2 WHERE id = ?3",
            params![exercise.name, exercise.code, exercise.id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn count(&self) -> i32 {
        if self.is_dummy {
            return 0;
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return 0,
        };
        
        let count: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM exercise 
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)",
            [],
            |row| row.get(0),
        );
        
        count.unwrap_or(0)
    }

    fn search_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Exercise> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let offset = (page - 1) * page_size;
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code FROM exercise 
             WHERE (name LIKE ?1 OR code LIKE ?1) 
             AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name
             LIMIT ?2 OFFSET ?3"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let exercise_iter = match stmt.query_map(params![search_pattern, page_size, offset], |row| {
            Ok(Exercise {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        exercise_iter.filter_map(|exercise| exercise.ok()).collect()
    }

    fn search_count(&self, query: &str) -> i32 {
        if self.is_dummy {
            return 0;
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return 0,
        };
        
        let search_pattern = format!("%{}%", query);
        
        let count: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM exercise 
             WHERE (name LIKE ?1 OR code LIKE ?1) 
             AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)",
            params![search_pattern],
            |row| row.get(0),
        );
        
        count.unwrap_or(0)
    }

    fn list_deleted(&self) -> Vec<Exercise> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code FROM exercise 
             WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0
             ORDER BY deleted_at DESC"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };
        
        let exercise_iter = match stmt.query_map([], |row| {
            Ok(Exercise {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        exercise_iter.filter_map(|exercise| exercise.ok()).collect()
    }

    fn count_deleted(&self) -> i32 {
        if self.is_dummy {
            return 0;
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return 0,
        };
        
        let count: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM exercise 
             WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0",
            [],
            |row| row.get(0),
        );
        
        count.unwrap_or(0)
    }
} 