use rusqlite::{Connection, Result as SqliteResult, params};
use crate::models::routine::{Routine, RoutineExercise, RoutineWithExercises, RoutineExerciseWithDetails};
use crate::repository::routine_repository::RoutineRepository;

pub struct SqliteRoutineRepository {
    db_path: String,
}

impl SqliteRoutineRepository {
    pub fn new(db_path: &str) -> Self {
        let repo = Self {
            db_path: db_path.to_string(),
        };
        repo.create_tables().expect("Failed to create routine tables");
        repo
    }

    fn create_tables(&self) -> SqliteResult<()> {
        let conn = self.get_connection()?;
        
        // Create routines table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS routines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create routine_exercises table (junction table)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS routine_exercises (
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
            )",
            [],
        )?;

        // Check if group_number migration is needed
        if self.check_if_routine_group_migration_needed()? {
            self.migrate_routine_group_column()?;
        }

        // Create indexes for better performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id 
             ON routine_exercises (routine_id)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_routine_exercises_order 
             ON routine_exercises (routine_id, order_index)",
            [],
        )?;

        Ok(())
    }

    fn check_if_routine_group_migration_needed(&self) -> SqliteResult<bool> {
        let conn = self.get_connection()?;
        
        let mut stmt = conn.prepare("PRAGMA table_info(routine_exercises)")?;
        let column_info: Result<Vec<String>, _> = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(1)?) // Column name is at index 1
        })?.collect();
        
        match column_info {
            Ok(columns) => Ok(!columns.contains(&"group_number".to_string())),
            Err(_) => Ok(false),
        }
    }

    fn migrate_routine_group_column(&self) -> SqliteResult<()> {
        let conn = self.get_connection()?;
        
        println!("Adding group_number column to routine_exercises table...");
        
        conn.execute(
            "ALTER TABLE routine_exercises ADD COLUMN group_number INTEGER DEFAULT 1",
            [],
        )?;
        
        println!("group_number column added successfully to routine_exercises table");
        Ok(())
    }

    fn get_connection(&self) -> SqliteResult<Connection> {
        Connection::open(&self.db_path)
    }
}

impl RoutineRepository for SqliteRoutineRepository {
    fn create_routine(&self, routine: Routine) -> Result<i32, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "INSERT INTO routines (name, code) VALUES (?1, ?2)",
            params![routine.name, routine.code],
        ).map_err(|e| e.to_string())?;

        let routine_id = conn.last_insert_rowid() as i32;
        Ok(routine_id)
    }

    fn get_routine_by_id(&self, id: i32) -> Option<Routine> {
        let conn = self.get_connection().ok()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, name, code, created_at, updated_at FROM routines WHERE id = ?1"
        ).ok()?;

        let routine = stmt.query_row(params![id], |row| {
            Ok(Routine {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }).ok()?;

        Some(routine)
    }

    fn get_routine_with_exercises(&self, id: i32) -> Option<RoutineWithExercises> {
        let routine = self.get_routine_by_id(id)?;
        let exercises = self.get_routine_exercises(id);

        Some(RoutineWithExercises {
            id: routine.id,
            name: routine.name,
            code: routine.code,
            created_at: routine.created_at,
            updated_at: routine.updated_at,
            exercises,
        })
    }

    fn update_routine(&self, routine: Routine) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "UPDATE routines SET name = ?1, code = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            params![routine.name, routine.code, routine.id],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn delete_routine(&self, id: i32) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Start transaction to delete routine and its exercises
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        // Delete routine exercises first (due to foreign key constraint)
        tx.execute("DELETE FROM routine_exercises WHERE routine_id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        
        // Delete routine
        tx.execute("DELETE FROM routines WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn list_routines(&self) -> Vec<Routine> {
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn.prepare(
            "SELECT id, name, code, created_at, updated_at FROM routines ORDER BY name"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let routine_iter = match stmt.query_map([], |row| {
            Ok(Routine {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        routine_iter.filter_map(|routine| routine.ok()).collect()
    }

    fn list_routines_paginated(&self, page: i32, page_size: i32) -> Vec<Routine> {
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let offset = (page - 1) * page_size;
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code, created_at, updated_at FROM routines 
             ORDER BY name
             LIMIT ?1 OFFSET ?2"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let routine_iter = match stmt.query_map(params![page_size, offset], |row| {
            Ok(Routine {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        routine_iter.filter_map(|routine| routine.ok()).collect()
    }

    fn search_routines(&self, query: &str) -> Vec<Routine> {
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let search_pattern = format!("%{}%", query.to_lowercase());
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code, created_at, updated_at FROM routines 
             WHERE LOWER(name) LIKE ?1 OR LOWER(code) LIKE ?1 
             ORDER BY name"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let routine_iter = match stmt.query_map(params![search_pattern], |row| {
            Ok(Routine {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        routine_iter.filter_map(|routine| routine.ok()).collect()
    }

    fn search_routines_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Routine> {
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let search_pattern = format!("%{}%", query.to_lowercase());
        let offset = (page - 1) * page_size;
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, code, created_at, updated_at FROM routines 
             WHERE LOWER(name) LIKE ?1 OR LOWER(code) LIKE ?1 
             ORDER BY name
             LIMIT ?2 OFFSET ?3"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let routine_iter = match stmt.query_map(params![search_pattern, page_size, offset], |row| {
            Ok(Routine {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                code: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        routine_iter.filter_map(|routine| routine.ok()).collect()
    }

    fn add_exercise_to_routine(&self, routine_exercise: RoutineExercise) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, reps, weight, notes, group_number)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                routine_exercise.routine_id,
                routine_exercise.exercise_id,
                routine_exercise.order_index,
                routine_exercise.sets,
                routine_exercise.reps,
                routine_exercise.weight,
                routine_exercise.notes,
                routine_exercise.group_number
            ],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn update_routine_exercise(&self, routine_exercise: RoutineExercise) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "UPDATE routine_exercises 
             SET order_index = ?1, sets = ?2, reps = ?3, weight = ?4, notes = ?5, group_number = ?6, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?7",
            params![
                routine_exercise.order_index,
                routine_exercise.sets,
                routine_exercise.reps,
                routine_exercise.weight,
                routine_exercise.notes,
                routine_exercise.group_number,
                routine_exercise.id
            ],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn remove_exercise_from_routine(&self, routine_id: i32, exercise_id: i32) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "DELETE FROM routine_exercises WHERE routine_id = ?1 AND exercise_id = ?2",
            params![routine_id, exercise_id]
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn get_routine_exercises(&self, routine_id: i32) -> Vec<RoutineExerciseWithDetails> {
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn.prepare(
            "SELECT 
                re.id, re.routine_id, re.exercise_id, re.order_index, re.sets, re.reps, re.weight, re.notes, re.group_number,
                re.created_at, re.updated_at,
                e.name as exercise_name, e.code as exercise_code
             FROM routine_exercises re
             JOIN exercise e ON re.exercise_id = e.id
             WHERE re.routine_id = ?1
             ORDER BY re.order_index ASC"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let exercise_iter = match stmt.query_map(params![routine_id], |row| {
            Ok(RoutineExerciseWithDetails {
                id: Some(row.get(0)?),
                routine_id: row.get(1)?,
                exercise_id: row.get(2)?,
                order_index: row.get(3)?,
                sets: row.get(4)?,
                reps: row.get(5)?,
                weight: row.get(6)?,
                notes: row.get(7)?,
                group_number: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                exercise_name: row.get(11)?,
                exercise_code: row.get(12)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        exercise_iter.filter_map(|exercise| exercise.ok()).collect()
    }

    fn reorder_routine_exercises(&self, routine_id: i32, exercise_orders: Vec<(i32, i32)>) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        {
            let mut stmt = tx.prepare(
                "UPDATE routine_exercises SET order_index = ?1, updated_at = CURRENT_TIMESTAMP 
                 WHERE routine_id = ?2 AND exercise_id = ?3"
            ).map_err(|e| e.to_string())?;

            for (exercise_id, new_order) in exercise_orders {
                stmt.execute(params![new_order, routine_id, exercise_id])
                    .map_err(|e| e.to_string())?;
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn replace_routine_exercises(&self, routine_id: i32, exercises: Vec<RoutineExercise>) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        {
            // Delete existing exercises for this routine
            tx.execute("DELETE FROM routine_exercises WHERE routine_id = ?1", params![routine_id])
                .map_err(|e| e.to_string())?;
            
            // Insert new exercises
            if !exercises.is_empty() {
                let mut stmt = tx.prepare(
                    "INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, reps, weight, notes, group_number)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
                ).map_err(|e| e.to_string())?;

                for exercise in exercises {
                    stmt.execute(params![
                        exercise.routine_id,
                        exercise.exercise_id,
                        exercise.order_index,
                        exercise.sets,
                        exercise.reps,
                        exercise.weight,
                        exercise.notes,
                        exercise.group_number
                    ]).map_err(|e| e.to_string())?;
                }
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }
} 