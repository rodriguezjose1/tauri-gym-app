use rusqlite::{Connection, Result, params};
use crate::models::routine_exercise::{RoutineExercise, RoutineExerciseWithDetails};
use crate::repository::routine_exercise_repository::RoutineExerciseRepository;

pub struct SqliteRoutineExerciseRepository {
    db_path: String,
}

impl SqliteRoutineExerciseRepository {
    pub fn new(db_path: &str) -> Self {
        Self {
            db_path: db_path.to_string(),
        }
    }

    fn get_connection(&self) -> Result<Connection> {
        Connection::open(&self.db_path)
    }
}

impl RoutineExerciseRepository for SqliteRoutineExerciseRepository {
    fn create(&self, routine_exercise: RoutineExercise) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, reps, weight, notes, group_number, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))",
            params![
                routine_exercise.routine_id,
                routine_exercise.exercise_id,
                routine_exercise.order_index,
                routine_exercise.sets,
                routine_exercise.reps,
                routine_exercise.weight,
                routine_exercise.notes,
                routine_exercise.group_number,
            ],
        ).map_err(|e| e.to_string())?;
        
        Ok(())
    }

    fn get_by_routine_id(&self, routine_id: i32) -> Vec<RoutineExerciseWithDetails> {
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn.prepare(
            "SELECT re.id, re.routine_id, re.exercise_id, re.order_index, re.sets, re.reps, re.weight, re.notes, re.group_number, re.created_at, re.updated_at, e.name, e.code 
             FROM routine_exercises re 
             JOIN exercise e ON re.exercise_id = e.id 
             WHERE re.routine_id = ? 
             ORDER BY re.order_index"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let rows = match stmt.query_map(params![routine_id], |row| {
            Ok(RoutineExerciseWithDetails {
                id: row.get(0)?,
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
            Ok(rows) => rows,
            Err(_) => return Vec::new(),
        };

        rows.filter_map(|row| row.ok()).collect()
    }

    fn update(&self, routine_exercise: RoutineExercise) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "UPDATE routine_exercises SET routine_id = ?1, exercise_id = ?2, order_index = ?3, sets = ?4, reps = ?5, weight = ?6, notes = ?7, group_number = ?8, updated_at = datetime('now') WHERE id = ?9",
            params![
                routine_exercise.routine_id,
                routine_exercise.exercise_id,
                routine_exercise.order_index,
                routine_exercise.sets,
                routine_exercise.reps,
                routine_exercise.weight,
                routine_exercise.notes,
                routine_exercise.group_number,
                routine_exercise.id,
            ],
        ).map_err(|e| e.to_string())?;
        
        Ok(())
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM routine_exercises WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }

    fn delete_by_routine_and_exercise(&self, routine_id: i32, exercise_id: i32) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "DELETE FROM routine_exercises WHERE routine_id = ? AND exercise_id = ?", 
            params![routine_id, exercise_id]
        ).map_err(|e| e.to_string())?;
        
        Ok(())
    }

    fn update_order(&self, exercise_orders: Vec<(i32, i32)>) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        for (id, order) in exercise_orders {
            conn.execute(
                "UPDATE routine_exercises SET order_index = ? WHERE id = ?",
                params![order, id],
            ).map_err(|e| e.to_string())?;
        }
        
        Ok(())
    }

    fn replace_routine_exercises(&self, routine_id: i32, exercises: Vec<RoutineExercise>) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Delete existing exercises for this routine
        conn.execute("DELETE FROM routine_exercises WHERE routine_id = ?", params![routine_id])
            .map_err(|e| e.to_string())?;
        
        // Insert new exercises
        for exercise in exercises {
            conn.execute(
                "INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, reps, weight, notes, group_number, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))",
                params![
                    routine_id,
                    exercise.exercise_id,
                    exercise.order_index,
                    exercise.sets,
                    exercise.reps,
                    exercise.weight,
                    exercise.notes,
                    exercise.group_number,
                ],
            ).map_err(|e| e.to_string())?;
        }
        
        Ok(())
    }
} 