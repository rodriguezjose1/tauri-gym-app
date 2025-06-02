use crate::models::exercise::Exercise;

pub trait ExerciseRepository: Send + Sync {
    fn create(&self, exercise: Exercise) -> Result<(), String>;
    fn list(&self) -> Vec<Exercise>;
    fn list_paginated(&self, page: i32, page_size: i32) -> Vec<Exercise>;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn update(&self, exercise: Exercise) -> Result<(), String>;
    fn search_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Exercise>;
} 