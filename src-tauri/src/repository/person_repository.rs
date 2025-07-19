use crate::models::person::Person;

pub trait PersonRepository: Send + Sync {
    fn create(&self, person: Person) -> Result<(), String>;
    fn get_by_id(&self, id: i32) -> Option<Person>;
    fn update(&self, person: Person) -> Result<(), String>;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn restore(&self, id: i32) -> Result<(), String>;
    fn list_all(&self) -> Vec<Person>;
    fn list_paginated(&self, page: i32, page_size: i32) -> Vec<Person>;
    fn search(&self, query: &str) -> Vec<Person>;
    fn search_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Person>;
    fn count_all(&self) -> i32;
    fn search_count(&self, query: &str) -> i32;
    fn list_deleted(&self) -> Vec<Person>;
    fn count_deleted(&self) -> i32;
}
