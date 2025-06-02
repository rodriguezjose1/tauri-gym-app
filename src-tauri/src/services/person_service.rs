use crate::models::person::Person;
use crate::repository::person_repository::PersonRepository;
use std::sync::Arc;

pub struct PersonService {
    repository: Arc<dyn PersonRepository>,
}

impl PersonService {
    pub fn new(repository: Arc<dyn PersonRepository>) -> Self {
        Self { repository }
    }

    pub fn create_person(&self, person: Person) -> Result<(), String> {
        // Validate person data
        if person.name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        if person.last_name.trim().is_empty() {
            return Err("Last name cannot be empty".to_string());
        }
        if person.phone.trim().is_empty() {
            return Err("Phone cannot be empty".to_string());
        }

        self.repository.create(person)
    }

    pub fn list_people(&self) -> Vec<Person> {
        self.repository.list_all()
    }

    pub fn list_people_paginated(&self, page: i32, page_size: i32) -> Vec<Person> {
        self.repository.list_paginated(page, page_size)
    }

    pub fn search_people(&self, query: &str) -> Vec<Person> {
        if query.trim().is_empty() {
            return self.repository.list_all();
        }
        self.repository.search(query)
    }

    pub fn search_people_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Person> {
        if query.trim().is_empty() {
            return Vec::new();
        }
        self.repository.search_paginated(query, page, page_size)
    }

    pub fn delete_person(&self, id: i32) -> Result<(), String> {
        self.repository.delete(id)
    }

    pub fn update_person(&self, person: Person) -> Result<(), String> {
        // Validate person data
        if person.name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        if person.last_name.trim().is_empty() {
            return Err("Last name cannot be empty".to_string());
        }
        if person.phone.trim().is_empty() {
            return Err("Phone cannot be empty".to_string());
        }

        self.repository.update(person)
    }
}
