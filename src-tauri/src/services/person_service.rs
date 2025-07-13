use crate::models::person::{Person, PaginatedPersonResponse};
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

    pub fn list_people_paginated_response(&self, page: i32, page_size: i32) -> PaginatedPersonResponse {
        let persons = self.repository.list_paginated(page, page_size);
        let total = self.repository.count_all();
        let total_pages = if page_size > 0 { (total + page_size - 1) / page_size } else { 0 };

        PaginatedPersonResponse {
            persons,
            total,
            page,
            page_size,
            total_pages,
        }
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

    pub fn search_people_paginated_response(&self, query: &str, page: i32, page_size: i32) -> PaginatedPersonResponse {
        if query.trim().is_empty() {
            return PaginatedPersonResponse {
                persons: Vec::new(),
                total: 0,
                page,
                page_size,
                total_pages: 0,
            };
        }
        
        let persons = self.repository.search_paginated(query, page, page_size);
        let total = self.repository.search_count(query);
        let total_pages = if page_size > 0 { (total + page_size - 1) / page_size } else { 0 };

        PaginatedPersonResponse {
            persons,
            total,
            page,
            page_size,
            total_pages,
        }
    }

    pub fn update_person(&self, person: Person) -> Result<(), String> {
        self.repository.update(person)
    }

    pub fn delete_person(&self, id: i32) -> Result<(), String> {
        self.repository.delete(id)
    }
}
