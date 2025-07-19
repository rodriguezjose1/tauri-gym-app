use crate::models::exercise::Exercise;

pub trait ExerciseRepository: Send + Sync {
    fn create(&self, exercise: Exercise) -> Result<(), String>;
    fn list(&self) -> Vec<Exercise>;
    fn list_paginated(&self, page: i32, page_size: i32) -> Vec<Exercise>;
    fn count(&self) -> i32;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn restore(&self, id: i32) -> Result<(), String>;
    fn update(&self, exercise: Exercise) -> Result<(), String>;
    fn search_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Exercise>;
    fn search_count(&self, query: &str) -> i32;
    fn list_deleted(&self) -> Vec<Exercise>;
    fn count_deleted(&self) -> i32;
} 