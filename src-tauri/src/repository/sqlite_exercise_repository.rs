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
        conn.execute(
            "CREATE TABLE IF NOT EXISTS exercise (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE
            )",
            [],
        )?;
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
        
        let mut stmt = match conn.prepare("SELECT id, name, code FROM exercise ORDER BY name") {
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
        conn.execute("DELETE FROM exercise WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
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

        match conn.query_row("SELECT COUNT(*) FROM exercise", [], |row| row.get(0)) {
            Ok(count) => count,
            Err(_) => 0,
        }
    }

    fn search_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Exercise> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let search_pattern = format!("%{}%", query.to_lowercase());
        let offset = (page - 1) * page_size;
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code FROM exercise 
             WHERE LOWER(name) LIKE ?1 OR LOWER(code) LIKE ?1 
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

        let search_pattern = format!("%{}%", query.to_lowercase());
        
        match conn.query_row(
            "SELECT COUNT(*) FROM exercise WHERE LOWER(name) LIKE ?1 OR LOWER(code) LIKE ?1",
            params![search_pattern],
            |row| row.get(0)
        ) {
            Ok(count) => count,
            Err(_) => 0,
        }
    }
} 