use crate::models::exercise::Exercise;
use crate::repository::exercise_repository::ExerciseRepository;
use rusqlite::{Connection, params};
use std::sync::{Arc, Mutex};

pub struct SqliteExerciseRepository {
    conn: Arc<Mutex<Connection>>,
}

impl SqliteExerciseRepository {
    pub fn new(db_path: &str) -> Self {
        let conn = Connection::open(db_path).expect("Failed to connect to DB");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS exercise (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE
            )",
            [],
        ).unwrap();

        Self { 
            conn: Arc::new(Mutex::new(conn))
        }
    }
}

impl ExerciseRepository for SqliteExerciseRepository {
    fn create(&self, exercise: Exercise) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO exercise (name, code) VALUES (?1, ?2)",
            params![exercise.name, exercise.code],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn list(&self) -> Vec<Exercise> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, code FROM exercise ORDER BY name").unwrap();
        let exercise_iter = stmt
            .query_map([], |row| {
                Ok(Exercise {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    code: row.get(2)?,
                })
            })
            .unwrap();

        exercise_iter.filter_map(Result::ok).collect()
    }

    fn list_paginated(&self, page: i32, page_size: i32) -> Vec<Exercise> {
        let conn = match self.conn.lock() {
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
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM exercise WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn update(&self, exercise: Exercise) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE exercise SET name = ?1, code = ?2 WHERE id = ?3",
            params![exercise.name, exercise.code, exercise.id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn search_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Exercise> {
        let conn = match self.conn.lock() {
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
} 