use rusqlite::{Connection, Result as SqliteResult, params};
use crate::models::workout_entry::{WorkoutEntry, WorkoutEntryWithDetails};
use crate::repository::workout_entry_repository::WorkoutEntryRepository;

pub struct SqliteWorkoutEntryRepository {
    db_path: String,
    is_dummy: bool,
}

impl SqliteWorkoutEntryRepository {
    /// Private constructor
    fn new(db_path: &str, is_dummy: bool) -> Self {
        Self {
            db_path: db_path.to_string(),
            is_dummy,
        }
    }

    /// Safe constructor: returns error if table creation fails
    pub fn new_safe(db_path: &str) -> Result<Self, String> {
        let repo = Self::new(db_path, false);
        if let Err(e) = repo.create_table() {
            return Err(format!("Failed to create workout_entries table: {}", e));
        }
        Ok(repo)
    }

    /// Dummy constructor: always returns empty results or errors
    pub fn new_dummy() -> Self {
        Self::new("", true)
    }

    fn create_table(&self) -> SqliteResult<()> {
        if self.is_dummy { return Ok(()); }
        let conn = self.get_connection()?;
        
        // Check if we need to migrate from old schema
        if self.check_if_migration_needed(&conn)? {
            self.migrate_date_column(&conn)?;
        } else if self.check_if_order_migration_needed(&conn)? {
            self.migrate_order_column(&conn)?;
        } else if self.check_if_group_migration_needed(&conn)? {
            self.migrate_group_column(&conn)?;
        } else {
            // Create new table with DATE type, order column, and group_number column
            conn.execute(
                "CREATE TABLE IF NOT EXISTS workout_entries (
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
                )",
                [],
            )?;
        }

        // Create index for better query performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_workout_entries_person_date 
             ON workout_entries (person_id, date)",
            [],
        )?;

        Ok(())
    }

    fn check_if_migration_needed(&self, conn: &Connection) -> SqliteResult<bool> {
        if self.is_dummy { return Ok(false); }
        // Check if table exists and has TEXT date column
        let mut stmt = conn.prepare(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='workout_entries'"
        )?;
        
        let table_sql: Result<String, _> = stmt.query_row([], |row| {
            Ok(row.get::<_, String>(0)?)
        });
        
        match table_sql {
            Ok(sql) => Ok(sql.contains("date TEXT")),
            Err(_) => Ok(false), // Table doesn't exist, no migration needed
        }
    }

    fn check_if_order_migration_needed(&self, conn: &Connection) -> SqliteResult<bool> {
        if self.is_dummy { return Ok(false); }
        // Check if table exists but doesn't have order_index column
        let mut stmt = conn.prepare(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='workout_entries'"
        )?;
        
        let table_sql: Result<String, _> = stmt.query_row([], |row| {
            Ok(row.get::<_, String>(0)?)
        });
        
        match table_sql {
            Ok(sql) => Ok(!sql.contains("order_index") && sql.contains("date DATE")),
            Err(_) => Ok(false), // Table doesn't exist, no migration needed
        }
    }

    fn check_if_group_migration_needed(&self, conn: &Connection) -> SqliteResult<bool> {
        if self.is_dummy { return Ok(false); }
        // Check if table exists but doesn't have group_number column
        let mut stmt = conn.prepare(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='workout_entries'"
        )?;
        
        let table_sql: Result<String, _> = stmt.query_row([], |row| {
            Ok(row.get::<_, String>(0)?)
        });
        
        match table_sql {
            Ok(sql) => Ok(!sql.contains("group_number") && sql.contains("order_index")),
            Err(_) => Ok(false), // Table doesn't exist, no migration needed
        }
    }

    fn migrate_order_column(&self, conn: &Connection) -> SqliteResult<()> {
        if self.is_dummy { return Ok(()); }
        println!("Adding order_index column to workout_entries table...");
        
        // Add the order_index column with default value 0
        conn.execute(
            "ALTER TABLE workout_entries ADD COLUMN order_index INTEGER DEFAULT 0",
            [],
        )?;
        
        println!("Order column migration completed successfully!");
        Ok(())
    }

    fn migrate_date_column(&self, conn: &Connection) -> SqliteResult<()> {
        if self.is_dummy { return Ok(()); }
        println!("Migrating workout_entries table from TEXT to DATE...");
        
        // Start transaction
        let tx = conn.unchecked_transaction()?;
        
        // Create new table with DATE type and order column
        tx.execute(
            "CREATE TABLE workout_entries_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                date DATE NOT NULL,
                sets INTEGER,
                reps INTEGER,
                weight REAL,
                notes TEXT,
                order_index INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercise (id) ON DELETE CASCADE
            )",
            [],
        )?;
        
        // Copy data from old table to new table, ensuring date format is correct
        tx.execute(
            "INSERT INTO workout_entries_new (id, person_id, exercise_id, date, sets, reps, weight, notes, order_index, created_at, updated_at)
             SELECT id, person_id, exercise_id, 
                    CASE 
                        WHEN length(date) = 10 AND date LIKE '____-__-__' THEN date
                        ELSE date('now')
                    END as date,
                    sets, reps, weight, notes, 0 as order_index, created_at, updated_at
             FROM workout_entries",
            [],
        )?;
        
        // Drop old table
        tx.execute("DROP TABLE workout_entries", [])?;
        
        // Rename new table
        tx.execute("ALTER TABLE workout_entries_new RENAME TO workout_entries", [])?;
        
        // Commit transaction
        tx.commit()?;
        
        println!("Migration completed successfully!");
        Ok(())
    }

    fn migrate_group_column(&self, conn: &Connection) -> SqliteResult<()> {
        if self.is_dummy { return Ok(()); }
        println!("Adding group_number column to workout_entries table...");
        
        // Add the group_number column with default value 1
        conn.execute(
            "ALTER TABLE workout_entries ADD COLUMN group_number INTEGER DEFAULT 1",
            [],
        )?;
        
        println!("Group column migration completed successfully!");
        Ok(())
    }

    fn get_connection(&self) -> SqliteResult<Connection> {
        if self.is_dummy {
            return Err(rusqlite::Error::InvalidQuery);
        }
        Connection::open(&self.db_path)
    }
}

impl WorkoutEntryRepository for SqliteWorkoutEntryRepository {
    fn create(&self, workout_entry: WorkoutEntry) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "INSERT INTO workout_entries (person_id, exercise_id, date, sets, reps, weight, notes, order_index, group_number)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                workout_entry.person_id,
                workout_entry.exercise_id,
                workout_entry.date,
                workout_entry.sets,
                workout_entry.reps,
                workout_entry.weight,
                workout_entry.notes,
                workout_entry.order_index.unwrap_or(0),
                workout_entry.group_number.unwrap_or(1)
            ],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn create_batch(&self, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        if workout_entries.is_empty() {
            return Ok(());
        }

        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Start a transaction for batch insert
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        {
            let mut stmt = tx.prepare(
                "INSERT INTO workout_entries (person_id, exercise_id, date, sets, reps, weight, notes, order_index, group_number)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
            ).map_err(|e| e.to_string())?;

            for workout_entry in workout_entries {
                stmt.execute(params![
                    workout_entry.person_id,
                    workout_entry.exercise_id,
                    workout_entry.date,
                    workout_entry.sets,
                    workout_entry.reps,
                    workout_entry.weight,
                    workout_entry.notes,
                    workout_entry.order_index.unwrap_or(0),
                    workout_entry.group_number.unwrap_or(1)
                ]).map_err(|e| e.to_string())?;
            }
        }
        
        // Commit the transaction
        tx.commit().map_err(|e| e.to_string())?;
        
        Ok(())
    }

    fn get_by_id(&self, id: i32) -> Option<WorkoutEntry> {
        if self.is_dummy { return None; }
        let conn = self.get_connection().ok()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, person_id, exercise_id, date, sets, reps, weight, notes, order_index, group_number, created_at, updated_at
             FROM workout_entries WHERE id = ?1"
        ).ok()?;

        let workout_entry = stmt.query_row(params![id], |row| {
            Ok(WorkoutEntry {
                id: Some(row.get(0)?),
                person_id: row.get(1)?,
                exercise_id: row.get(2)?,
                date: row.get(3)?,
                sets: row.get(4)?,
                reps: row.get(5)?,
                weight: row.get(6)?,
                notes: row.get(7)?,
                order_index: row.get(8)?,
                group_number: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        }).ok()?;

        Some(workout_entry)
    }

    fn get_by_person_and_date_range(&self, person_id: i32, start_date: &str, end_date: &str) -> Vec<WorkoutEntryWithDetails> {
        if self.is_dummy { return Vec::new(); }
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn.prepare(
            "SELECT 
                we.id, we.person_id, we.exercise_id, we.date, we.sets, we.reps, we.weight, we.notes, we.order_index, we.group_number,
                we.created_at, we.updated_at,
                p.name as person_name, p.last_name as person_last_name,
                e.name as exercise_name, e.code as exercise_code
             FROM workout_entries we
             JOIN people p ON we.person_id = p.id
             JOIN exercise e ON we.exercise_id = e.id
             WHERE we.person_id = ?1 AND date(we.date) >= date(?2) AND date(we.date) <= date(?3)
             ORDER BY we.date DESC, we.order_index ASC, we.created_at DESC"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let workout_entries = match stmt.query_map(params![person_id, start_date, end_date], |row| {
            Ok(WorkoutEntryWithDetails {
                id: Some(row.get(0)?),
                person_id: row.get(1)?,
                exercise_id: row.get(2)?,
                date: row.get(3)?,
                sets: row.get(4)?,
                reps: row.get(5)?,
                weight: row.get(6)?,
                notes: row.get(7)?,
                order_index: row.get(8)?,
                group_number: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                person_name: row.get(12)?,
                person_last_name: row.get(13)?,
                exercise_name: row.get(14)?,
                exercise_code: row.get(15)?,
            })
        }) {
            Ok(rows) => rows,
            Err(_) => return Vec::new(),
        };

        workout_entries.filter_map(|entry| entry.ok()).collect()
    }

    fn get_by_person(&self, person_id: i32) -> Vec<WorkoutEntryWithDetails> {
        if self.is_dummy { return Vec::new(); }
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn.prepare(
            "SELECT 
                we.id, we.person_id, we.exercise_id, we.date, we.sets, we.reps, we.weight, we.notes, we.order_index, we.group_number,
                we.created_at, we.updated_at,
                p.name as person_name, p.last_name as person_last_name,
                e.name as exercise_name, e.code as exercise_code
             FROM workout_entries we
             JOIN people p ON we.person_id = p.id
             JOIN exercise e ON we.exercise_id = e.id
             WHERE we.person_id = ?1
             ORDER BY we.date DESC, we.order_index ASC, we.created_at DESC"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let workout_entries = match stmt.query_map(params![person_id], |row| {
            Ok(WorkoutEntryWithDetails {
                id: Some(row.get(0)?),
                person_id: row.get(1)?,
                exercise_id: row.get(2)?,
                date: row.get(3)?,
                sets: row.get(4)?,
                reps: row.get(5)?,
                weight: row.get(6)?,
                notes: row.get(7)?,
                order_index: row.get(8)?,
                group_number: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                person_name: row.get(12)?,
                person_last_name: row.get(13)?,
                exercise_name: row.get(14)?,
                exercise_code: row.get(15)?,
            })
        }) {
            Ok(rows) => rows,
            Err(_) => return Vec::new(),
        };

        workout_entries.filter_map(|entry| entry.ok()).collect()
    }

    fn update(&self, workout_entry: WorkoutEntry) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "UPDATE workout_entries 
             SET person_id = ?1, exercise_id = ?2, date = ?3, sets = ?4, reps = ?5, weight = ?6, notes = ?7, order_index = ?8, group_number = ?9
             WHERE id = ?10",
            params![
                workout_entry.person_id,
                workout_entry.exercise_id,
                workout_entry.date,
                workout_entry.sets,
                workout_entry.reps,
                workout_entry.weight,
                workout_entry.notes,
                workout_entry.order_index.unwrap_or(0),
                workout_entry.group_number.unwrap_or(1),
                workout_entry.id
            ],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM workout_entries WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn delete_by_person_and_date(&self, person_id: i32, date: &str) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "DELETE FROM workout_entries WHERE person_id = ?1 AND date(date) = date(?2)", 
            params![person_id, date]
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn list_all(&self) -> Vec<WorkoutEntryWithDetails> {
        if self.is_dummy { return Vec::new(); }
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn.prepare(
            "SELECT 
                we.id, we.person_id, we.exercise_id, we.date, we.sets, we.reps, we.weight, we.notes, we.order_index, we.group_number,
                we.created_at, we.updated_at,
                p.name as person_name, p.last_name as person_last_name,
                e.name as exercise_name, e.code as exercise_code
             FROM workout_entries we
             JOIN people p ON we.person_id = p.id
             JOIN exercise e ON we.exercise_id = e.id
             ORDER BY we.date DESC, we.order_index ASC, we.created_at DESC"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let workout_entries = match stmt.query_map([], |row| {
            Ok(WorkoutEntryWithDetails {
                id: Some(row.get(0)?),
                person_id: row.get(1)?,
                exercise_id: row.get(2)?,
                date: row.get(3)?,
                sets: row.get(4)?,
                reps: row.get(5)?,
                weight: row.get(6)?,
                notes: row.get(7)?,
                order_index: row.get(8)?,
                group_number: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                person_name: row.get(12)?,
                person_last_name: row.get(13)?,
                exercise_name: row.get(14)?,
                exercise_code: row.get(15)?,
            })
        }) {
            Ok(rows) => rows,
            Err(_) => return Vec::new(),
        };

        workout_entries.filter_map(|entry| entry.ok()).collect()
    }

    fn replace_session(&self, person_id: i32, date: &str, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Start a transaction for the replace operation
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        {
            // First, delete existing entries for this person and date
            tx.execute(
                "DELETE FROM workout_entries WHERE person_id = ?1 AND date(date) = date(?2)",
                params![person_id, date]
            ).map_err(|e| e.to_string())?;
            
            // Then, insert new entries if any
            if !workout_entries.is_empty() {
                let mut stmt = tx.prepare(
                    "INSERT INTO workout_entries (person_id, exercise_id, date, sets, reps, weight, notes, order_index, group_number)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
                ).map_err(|e| e.to_string())?;

                for workout_entry in workout_entries {
                    stmt.execute(params![
                        workout_entry.person_id,
                        workout_entry.exercise_id,
                        workout_entry.date,
                        workout_entry.sets,
                        workout_entry.reps,
                        workout_entry.weight,
                        workout_entry.notes,
                        workout_entry.order_index.unwrap_or(0),
                        workout_entry.group_number.unwrap_or(1)
                    ]).map_err(|e| e.to_string())?;
                }
            }
        }
        
        // Commit the transaction
        tx.commit().map_err(|e| e.to_string())?;
        
        Ok(())
    }

    fn replace_session_granular(&self, ids_to_delete: Vec<i32>, workout_entries_to_insert: Vec<WorkoutEntry>) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Start a transaction for the granular replace operation
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        {
            // First, delete specific entries by ID
            if !ids_to_delete.is_empty() {
                let placeholders = ids_to_delete.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                let delete_query = format!("DELETE FROM workout_entries WHERE id IN ({})", placeholders);
                
                let params: Vec<&dyn rusqlite::ToSql> = ids_to_delete.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
                tx.execute(&delete_query, &params[..]).map_err(|e| e.to_string())?;
            }
            
            // Then, batch insert new entries
            if !workout_entries_to_insert.is_empty() {
                let mut stmt = tx.prepare(
                    "INSERT INTO workout_entries (person_id, exercise_id, date, sets, reps, weight, notes, order_index, group_number)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
                ).map_err(|e| e.to_string())?;

                for workout_entry in workout_entries_to_insert {
                    stmt.execute(params![
                        workout_entry.person_id,
                        workout_entry.exercise_id,
                        workout_entry.date,
                        workout_entry.sets,
                        workout_entry.reps,
                        workout_entry.weight,
                        workout_entry.notes,
                        workout_entry.order_index.unwrap_or(0),
                        workout_entry.group_number.unwrap_or(1)
                    ]).map_err(|e| e.to_string())?;
                }
            }
        }
        
        // Commit the transaction
        tx.commit().map_err(|e| e.to_string())?;
        
        Ok(())
    }

    fn update_exercise_order(&self, exercise_orders: Vec<(i32, i32)>) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        {
            let mut stmt = tx.prepare("UPDATE workout_entries SET order_index = ?1 WHERE id = ?2")
                .map_err(|e| e.to_string())?;
            
            for (id, order) in exercise_orders {
                stmt.execute(params![order, id]).map_err(|e| e.to_string())?;
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn renumber_groups(&self, person_id: i32, date: &str) -> Result<(), String> {
        if self.is_dummy { return Err("WorkoutEntry repository unavailable".to_string()); }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        // Start transaction
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        
        {
            // Get all distinct group numbers for this person and date, ordered by group number
            let mut stmt = tx.prepare(
                "SELECT DISTINCT group_number FROM workout_entries 
                 WHERE person_id = ?1 AND date(date) = date(?2) 
                 ORDER BY group_number"
            ).map_err(|e| e.to_string())?;
            
            let group_numbers: Result<Vec<i32>, _> = stmt.query_map(params![person_id, date], |row| {
                Ok(row.get::<_, i32>(0)?)
            }).map_err(|e| e.to_string())?.collect();
            
            let group_numbers = group_numbers.map_err(|e| e.to_string())?;
            
            // Renumber groups consecutively starting from 1
            for (new_group_number, old_group_number) in group_numbers.iter().enumerate() {
                let new_group = (new_group_number + 1) as i32;
                
                // Only update if the group number needs to change
                if new_group != *old_group_number {
                    tx.execute(
                        "UPDATE workout_entries 
                         SET group_number = ?1 
                         WHERE person_id = ?2 AND date(date) = date(?3) AND group_number = ?4",
                        params![new_group, person_id, date, old_group_number]
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }
} 