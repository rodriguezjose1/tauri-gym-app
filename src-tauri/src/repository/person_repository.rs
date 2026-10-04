use crate::models::person::Person;

pub trait PersonRepository: Send + Sync {
    fn create(&self, person: Person) -> Result<(), String>;
    fn get_by_id(&self, id: i32) -> Result<Option<Person>, String>;
    fn update(&self, person: Person) -> Result<(), String>;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn restore(&self, id: i32) -> Result<(), String>;
    fn list_all(&self) -> Result<Vec<Person>, String>;
    fn list_paginated(&self, page: i32, page_size: i32) -> Result<Vec<Person>, String>;
    fn search(&self, query: &str) -> Result<Vec<Person>, String>;
    fn search_paginated(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<Vec<Person>, String>;
    fn count_all(&self) -> Result<i32, String>;
    fn search_count(&self, query: &str) -> Result<i32, String>;
    fn list_deleted(&self) -> Result<Vec<Person>, String>;
    fn count_deleted(&self) -> Result<i32, String>;
}
