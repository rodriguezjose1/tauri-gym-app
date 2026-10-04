use crate::models::person::{PaginatedPersonResponse, Person};
use crate::repository::person_repository::PersonRepository;
use std::sync::Arc;

pub struct PersonService {
    repository: Arc<dyn PersonRepository>,
}

impl PersonService {
    const MAX_PAGE_SIZE: i32 = 100;

    pub fn new(repository: Arc<dyn PersonRepository>) -> Self {
        Self { repository }
    }

    pub fn create_person(&self, person: Person) -> Result<(), String> {
        Self::validate_person(&person, false)?;
        self.repository.create(person)
    }

    fn validate_person(person: &Person, require_id: bool) -> Result<(), String> {
        if require_id && person.id.filter(|id| *id > 0).is_none() {
            return Err("Person id is required".to_string());
        }
        if person.name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        if person.last_name.trim().is_empty() {
            return Err("Last name cannot be empty".to_string());
        }
        if person.phone.trim().is_empty() {
            return Err("Phone cannot be empty".to_string());
        }

        Ok(())
    }

    fn validate_pagination(page: i32, page_size: i32) -> Result<(), String> {
        if page < 1 {
            return Err("Page must be greater than or equal to 1".to_string());
        }
        if !(1..=Self::MAX_PAGE_SIZE).contains(&page_size) {
            return Err(format!(
                "Page size must be between 1 and {}",
                Self::MAX_PAGE_SIZE
            ));
        }
        Ok(())
    }

    pub fn list_people(&self) -> Result<Vec<Person>, String> {
        self.repository.list_all()
    }

    pub fn list_people_paginated(&self, page: i32, page_size: i32) -> Result<Vec<Person>, String> {
        Self::validate_pagination(page, page_size)?;
        self.repository.list_paginated(page, page_size)
    }

    pub fn list_people_paginated_response(
        &self,
        page: i32,
        page_size: i32,
    ) -> Result<PaginatedPersonResponse, String> {
        Self::validate_pagination(page, page_size)?;
        let persons = self.repository.list_paginated(page, page_size)?;
        let total = self.repository.count_all()?;
        let total_pages = (total + page_size - 1) / page_size;

        Ok(PaginatedPersonResponse {
            persons,
            total,
            page,
            page_size,
            total_pages,
        })
    }

    pub fn search_people(&self, query: &str) -> Result<Vec<Person>, String> {
        if query.trim().is_empty() {
            return self.repository.list_all();
        }
        self.repository.search(query)
    }

    pub fn search_people_paginated(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<Vec<Person>, String> {
        Self::validate_pagination(page, page_size)?;
        if query.trim().is_empty() {
            return self.repository.list_paginated(page, page_size);
        }
        self.repository.search_paginated(query, page, page_size)
    }

    pub fn search_people_paginated_response(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<PaginatedPersonResponse, String> {
        Self::validate_pagination(page, page_size)?;
        if query.trim().is_empty() {
            return self.list_people_paginated_response(page, page_size);
        }

        let persons = self.repository.search_paginated(query, page, page_size)?;
        let total = self.repository.search_count(query)?;
        let total_pages = (total + page_size - 1) / page_size;

        Ok(PaginatedPersonResponse {
            persons,
            total,
            page,
            page_size,
            total_pages,
        })
    }

    pub fn update_person(&self, person: Person) -> Result<(), String> {
        Self::validate_person(&person, true)?;
        self.repository.update(person)
    }

    pub fn delete_person(&self, id: i32) -> Result<(), String> {
        self.repository.delete(id)
    }

    pub fn restore_person(&self, id: i32) -> Result<(), String> {
        self.repository.restore(id)
    }

    pub fn list_deleted_people(&self) -> Result<Vec<Person>, String> {
        self.repository.list_deleted()
    }

    pub fn count_deleted_people(&self) -> Result<i32, String> {
        self.repository.count_deleted()
    }
}
