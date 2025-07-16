use rusqlite::{Connection, Result as SqliteResult, params};
use crate::models::person::Person;
use crate::repository::person_repository::PersonRepository;

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
        repo.create_table().map_err(|e| format!("Failed to create people table: {}", e))?;
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
            "CREATE TABLE IF NOT EXISTS people (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT NOT NULL
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

impl PersonRepository for SqlitePersonRepository {
    fn create(&self, person: Person) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }
        
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "INSERT INTO people (name, last_name, phone) VALUES (?1, ?2, ?3)",
            params![person.name, person.last_name, person.phone],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn get_by_id(&self, id: i32) -> Option<Person> {
        if self.is_dummy {
            return None;
        }
        
        let conn = self.get_connection().ok()?;
        
        let mut stmt = conn.prepare("SELECT id, name, last_name, phone FROM people WHERE id = ?1").ok()?;
        
        let person = stmt.query_row(params![id], |row| {
            Ok(Person {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                last_name: row.get(2)?,
                phone: row.get(3)?,
            })
        }).ok()?;

        Some(person)
    }

    fn list_all(&self) -> Vec<Person> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn.prepare("SELECT id, name, last_name, phone FROM people ORDER BY name, last_name") {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let person_iter = match stmt.query_map([], |row| {
            Ok(Person {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                last_name: row.get(2)?,
                phone: row.get(3)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        person_iter.filter_map(|person| person.ok()).collect()
    }

    fn search(&self, query: &str) -> Vec<Person> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let search_pattern = format!("%{}%", query.to_lowercase());
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, last_name, phone FROM people 
             WHERE LOWER(name) LIKE ?1 OR LOWER(last_name) LIKE ?1 
             ORDER BY name, last_name"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let person_iter = match stmt.query_map(params![search_pattern], |row| {
            Ok(Person {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                last_name: row.get(2)?,
                phone: row.get(3)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        person_iter.filter_map(|person| person.ok()).collect()
    }

    fn update(&self, person: Person) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }
        
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute(
            "UPDATE people SET name = ?1, last_name = ?2, phone = ?3 WHERE id = ?4",
            params![person.name, person.last_name, person.phone, person.id],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        if self.is_dummy {
            return Ok(());
        }
        
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        conn.execute("DELETE FROM people WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn search_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Person> {
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
            "SELECT id, name, last_name, phone FROM people 
             WHERE LOWER(name) LIKE ?1 OR LOWER(last_name) LIKE ?1 
             ORDER BY name, last_name
             LIMIT ?2 OFFSET ?3"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let person_iter = match stmt.query_map(params![search_pattern, page_size, offset], |row| {
            Ok(Person {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                last_name: row.get(2)?,
                phone: row.get(3)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        person_iter.filter_map(|person| person.ok()).collect()
    }

    fn list_paginated(&self, page: i32, page_size: i32) -> Vec<Person> {
        if self.is_dummy {
            return Vec::new();
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let offset = (page - 1) * page_size;
        
        let mut stmt = match conn.prepare(
            "SELECT id, name, last_name, phone FROM people 
             ORDER BY name, last_name
             LIMIT ?1 OFFSET ?2"
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };

        let person_iter = match stmt.query_map(params![page_size, offset], |row| {
            Ok(Person {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                last_name: row.get(2)?,
                phone: row.get(3)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return Vec::new(),
        };

        person_iter.filter_map(|person| person.ok()).collect()
    }

    fn count_all(&self) -> i32 {
        if self.is_dummy {
            return 0;
        }
        
        let conn = match self.get_connection() {
            Ok(conn) => conn,
            Err(_) => return 0,
        };

        match conn.query_row("SELECT COUNT(*) FROM people", [], |row| row.get(0)) {
            Ok(count) => count,
            Err(_) => 0,
        }
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
            "SELECT COUNT(*) FROM people WHERE LOWER(name) LIKE ?1 OR LOWER(last_name) LIKE ?1",
            params![search_pattern, search_pattern],
            |row| row.get(0)
        ) {
            Ok(count) => count,
            Err(_) => 0,
        }
    }
}

