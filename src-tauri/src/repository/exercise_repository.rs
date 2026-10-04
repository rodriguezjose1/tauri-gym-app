use crate::models::exercise::Exercise;

pub trait ExerciseRepository: Send + Sync {
    fn create(&self, exercise: Exercise) -> Result<(), String>;
    fn list(&self) -> Result<Vec<Exercise>, String>;
    fn list_paginated(&self, page: i32, page_size: i32) -> Result<Vec<Exercise>, String>;
    fn count(&self) -> Result<i32, String>;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn restore(&self, id: i32) -> Result<(), String>;
    fn update(&self, exercise: Exercise) -> Result<(), String>;
    fn search_paginated(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<Vec<Exercise>, String>;
    fn search_count(&self, query: &str) -> Result<i32, String>;
    fn list_deleted(&self) -> Result<Vec<Exercise>, String>;
    fn count_deleted(&self) -> Result<i32, String>;
}
