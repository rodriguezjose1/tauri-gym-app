use crate::config::search::{
    normalize_phone, normalize_search_text, person_name_is_similar, register_search_normalization,
};
use crate::models::person::{DeletedPerson, Person, PersonDuplicateCandidate};
use crate::repository::person_repository::PersonRepository;
use rusqlite::{params, Connection, Result as SqliteResult};

pub struct SqlitePersonRepository {
    db_path: String,
    is_dummy: bool,
}

impl SqlitePersonRepository {
    pub fn new_safe(db_path: &str) -> Result<Self, String> {
        let repo = Self {
            db_path: db_path.to_string(),
            is_dummy: false,
        };
        repo.create_table()
            .map_err(|e| format!("Failed to create people table: {}", e))?;
        Ok(repo)
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
                "CREATE TABLE IF NOT EXISTS people (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    deleted_at DATETIME NULL,
                    is_active BOOLEAN DEFAULT 1
                )",
                [],
            )?;
        }
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS person_activity_periods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id INTEGER NOT NULL REFERENCES people(id),
                active_from TEXT NOT NULL,
                inactive_from TEXT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX IF NOT EXISTS uq_open_person_activity
                ON person_activity_periods(person_id) WHERE inactive_from IS NULL;",
        )?;
        Ok(())
    }

    fn check_if_logical_deletion_migration_needed(&self, conn: &Connection) -> SqliteResult<bool> {
        if self.is_dummy {
            return Ok(false);
        }

        // Check if table exists but doesn't have logical deletion fields
        let mut stmt =
            conn.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='people'")?;

        let table_sql: Result<String, _> = stmt.query_row([], |row| Ok(row.get::<_, String>(0)?));

        match table_sql {
            Ok(sql) => Ok(!sql.contains("deleted_at") && !sql.contains("is_active")),
            Err(_) => Ok(false), // Table doesn't exist, no migration needed
        }
    }

    fn migrate_logical_deletion(&self, conn: &Connection) -> SqliteResult<()> {
        if self.is_dummy {
            return Ok(());
        }
        println!("Adding logical deletion fields to people table...");

        // Add logical deletion columns
        conn.execute("ALTER TABLE people ADD COLUMN deleted_at DATETIME NULL", [])?;

        conn.execute(
            "ALTER TABLE people ADD COLUMN is_active BOOLEAN DEFAULT 1",
            [],
        )?;

        println!("Logical deletion migration completed successfully!");
        Ok(())
    }

    fn get_connection(&self) -> SqliteResult<Connection> {
        if self.is_dummy {
            return Err(rusqlite::Error::InvalidQuery);
        }
        let connection = Connection::open(&self.db_path)?;
        register_search_normalization(&connection)?;
        Ok(connection)
    }
}

impl PersonRepository for SqlitePersonRepository {
    fn create(&self, person: Person) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }

        let conn = self.get_connection().map_err(|e| e.to_string())?;

        let transaction = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        transaction
            .execute(
                "INSERT INTO people (name, last_name, phone) VALUES (?1, ?2, ?3)",
                params![person.name, person.last_name, person.phone],
            )
            .map_err(|e| e.to_string())?;
        let person_id = transaction.last_insert_rowid();
        transaction.execute(
            "INSERT INTO person_activity_periods(person_id,active_from) VALUES(?1,strftime('%Y-%m','now','localtime'))",
            [person_id],
        ).map_err(|e| e.to_string())?;
        transaction.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn find_duplicates(
        &self,
        person: &Person,
        exclude_id: Option<i32>,
    ) -> Result<Vec<PersonDuplicateCandidate>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let connection = self.get_connection().map_err(|error| error.to_string())?;
        let normalized_name = normalize_search_text(&person.name);
        let normalized_last_name = normalize_search_text(&person.last_name);
        let normalized_phone = normalize_phone(&person.phone);
        let mut statement = connection
            .prepare(
                "SELECT id,name,last_name,phone,
                        CASE WHEN deleted_at IS NOT NULL AND deleted_at != '' THEN 1 ELSE 0 END
                 FROM people
                 WHERE (?1 IS NULL OR id != ?1)
                 ORDER BY CASE WHEN deleted_at IS NULL OR deleted_at='' THEN 0 ELSE 1 END,id",
            )
            .map_err(|error| error.to_string())?;
        let candidates = statement
            .query_map(params![exclude_id], |row| {
                let candidate = Person {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                };
                let same_name = normalize_search_text(&candidate.name) == normalized_name
                    && normalize_search_text(&candidate.last_name) == normalized_last_name;
                let same_phone = !normalized_phone.is_empty()
                    && normalize_phone(&candidate.phone) == normalized_phone;
                let similar_name = !same_name
                    && person_name_is_similar(
                        &candidate.name,
                        &candidate.last_name,
                        &person.name,
                        &person.last_name,
                    );
                Ok(PersonDuplicateCandidate {
                    same_name,
                    same_phone,
                    similar_name,
                    person: candidate,
                    is_deleted: row.get::<_, i64>(4)? != 0,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        Ok(candidates
            .into_iter()
            .filter(|candidate| {
                candidate.same_name || candidate.same_phone || candidate.similar_name
            })
            .collect())
    }

    fn get_by_id(&self, id: i32) -> Result<Option<Person>, String> {
        if self.is_dummy {
            return Ok(None);
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, name, last_name, phone FROM people WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        match stmt.query_row(params![id], |row| {
            Ok(Person {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                last_name: row.get(2)?,
                phone: row.get(3)?,
            })
        }) {
            Ok(person) => Ok(Some(person)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    fn list_all(&self) -> Result<Vec<Person>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, last_name, phone FROM people
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name, last_name",
            )
            .map_err(|e| e.to_string())?;

        let person_iter = stmt
            .query_map([], |row| {
                Ok(Person {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        person_iter
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    fn search(&self, query: &str) -> Result<Vec<Person>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;

        let search_pattern = format!("%{}%", normalize_search_text(query));

        let mut stmt = conn
            .prepare(
                "SELECT id, name, last_name, phone FROM people
             WHERE (search_normalize(name) LIKE ?1 OR search_normalize(last_name) LIKE ?1 OR search_normalize(name || ' ' || last_name) LIKE ?1)
             AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name, last_name",
            )
            .map_err(|e| e.to_string())?;

        let person_iter = stmt
            .query_map(params![search_pattern], |row| {
                Ok(Person {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        person_iter
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    fn update(&self, person: Person) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }

        let conn = self.get_connection().map_err(|e| e.to_string())?;

        let affected = conn
            .execute(
                "UPDATE people SET name = ?1, last_name = ?2, phone = ?3 WHERE id = ?4",
                params![person.name, person.last_name, person.phone, person.id],
            )
            .map_err(|e| e.to_string())?;
        if affected == 0 {
            Err("Person not found".into())
        } else {
            Ok(())
        }
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }

        let mut conn = self.get_connection().map_err(|e| e.to_string())?;

        // Logical deletion instead of physical deletion
        let transaction = conn.transaction().map_err(|e| e.to_string())?;
        let affected = transaction.execute(
            "UPDATE people SET deleted_at = datetime('now'), is_active = 0 WHERE id = ?1 AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)",
            params![id]
        ).map_err(|e| e.to_string())?;
        if affected == 0 {
            return Err("Active person not found".into());
        }
        transaction.execute(
            "UPDATE person_activity_periods SET inactive_from=strftime('%Y-%m','now','localtime') WHERE person_id=?1 AND inactive_from IS NULL",
            [id],
        ).map_err(|e| e.to_string())?;
        transaction.commit().map_err(|e| e.to_string())
    }

    fn search_paginated(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<Vec<Person>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;

        let search_pattern = format!("%{}%", normalize_search_text(query));
        let offset = (page - 1) * page_size;

        let mut stmt = conn
            .prepare(
                "SELECT id, name, last_name, phone FROM people
             WHERE (search_normalize(name) LIKE ?1 OR search_normalize(last_name) LIKE ?1 OR search_normalize(name || ' ' || last_name) LIKE ?1)
             AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name, last_name
             LIMIT ?2 OFFSET ?3",
            )
            .map_err(|e| e.to_string())?;

        let person_iter = stmt
            .query_map(params![search_pattern, page_size, offset], |row| {
                Ok(Person {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        person_iter
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    fn list_paginated(&self, page: i32, page_size: i32) -> Result<Vec<Person>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;

        let offset = (page - 1) * page_size;

        let mut stmt = conn
            .prepare(
                "SELECT id, name, last_name, phone FROM people
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)
             ORDER BY name, last_name
             LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| e.to_string())?;

        let person_iter = stmt
            .query_map(params![page_size, offset], |row| {
                Ok(Person {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        person_iter
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    fn count_all(&self) -> Result<i32, String> {
        if self.is_dummy {
            return Ok(0);
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT COUNT(*) FROM people 
             WHERE (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)",
            [],
            |row| row.get(0)
        ).map_err(|e| e.to_string())
    }

    fn search_count(&self, query: &str) -> Result<i32, String> {
        if self.is_dummy {
            return Ok(0);
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;

        let search_pattern = format!("%{}%", normalize_search_text(query));

        conn.query_row(
            "SELECT COUNT(*) FROM people 
             WHERE (search_normalize(name) LIKE ?1 OR search_normalize(last_name) LIKE ?1 OR search_normalize(name || ' ' || last_name) LIKE ?1)
             AND (deleted_at IS NULL OR deleted_at = '') AND (is_active = 1 OR is_active IS NULL)",
            params![search_pattern],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())
    }

    fn restore(&self, id: i32) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }

        let mut conn = self.get_connection().map_err(|e| e.to_string())?;

        // Restore logically deleted person
        let transaction = conn.transaction().map_err(|e| e.to_string())?;
        let affected = transaction.execute(
            "UPDATE people SET deleted_at = NULL, is_active = 1 WHERE id = ?1 AND deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0",
            params![id]
        ).map_err(|e| e.to_string())?;
        if affected == 0 {
            return Err("Deleted person not found".into());
        }
        transaction.execute(
            "INSERT INTO person_activity_periods(person_id,active_from) VALUES(?1,strftime('%Y-%m','now','localtime'))",
            [id],
        ).map_err(|e| e.to_string())?;
        transaction.commit().map_err(|e| e.to_string())
    }

    fn list_deleted(&self) -> Result<Vec<DeletedPerson>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, name, last_name, phone, deleted_at FROM people
             WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0
             ORDER BY name COLLATE NOCASE, last_name COLLATE NOCASE, id",
            )
            .map_err(|e| e.to_string())?;

        let person_iter = stmt
            .query_map([], |row| {
                Ok(DeletedPerson {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                    deleted_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        person_iter
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    fn list_deleted_paginated(
        &self,
        page: i32,
        page_size: i32,
    ) -> Result<Vec<DeletedPerson>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let offset = (page - 1) * page_size;
        let mut stmt = conn
            .prepare(
                "SELECT id,name,last_name,phone,deleted_at FROM people
                 WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0
                 ORDER BY name COLLATE NOCASE,last_name COLLATE NOCASE,id LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| e.to_string())?;
        let result = stmt
            .query_map(params![page_size, offset], |row| {
                Ok(DeletedPerson {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                    deleted_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        result
    }

    fn search_deleted_paginated(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<Vec<DeletedPerson>, String> {
        if self.is_dummy {
            return Ok(Vec::new());
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let pattern = format!("%{}%", normalize_search_text(query));
        let offset = (page - 1) * page_size;
        let mut stmt = conn.prepare(
            "SELECT id,name,last_name,phone,deleted_at FROM people
             WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0
             AND (search_normalize(name) LIKE ?1 OR search_normalize(last_name) LIKE ?1 OR search_normalize(name || ' ' || last_name) LIKE ?1)
             ORDER BY name COLLATE NOCASE,last_name COLLATE NOCASE,id LIMIT ?2 OFFSET ?3",
        ).map_err(|e| e.to_string())?;
        let result = stmt
            .query_map(params![pattern, page_size, offset], |row| {
                Ok(DeletedPerson {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    last_name: row.get(2)?,
                    phone: row.get(3)?,
                    deleted_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        result
    }

    fn search_deleted_count(&self, query: &str) -> Result<i32, String> {
        if self.is_dummy {
            return Ok(0);
        }
        let pattern = format!("%{}%", normalize_search_text(query));
        self.get_connection().map_err(|e| e.to_string())?.query_row(
            "SELECT COUNT(*) FROM people WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0
             AND (search_normalize(name) LIKE ?1 OR search_normalize(last_name) LIKE ?1 OR search_normalize(name || ' ' || last_name) LIKE ?1)",
            params![pattern], |row| row.get(0),
        ).map_err(|e| e.to_string())
    }

    fn count_deleted(&self) -> Result<i32, String> {
        if self.is_dummy {
            return Ok(0);
        }
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT COUNT(*) FROM people 
             WHERE deleted_at IS NOT NULL AND deleted_at != '' AND is_active = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())
    }
}
