use crate::models::exercise::Exercise;
use crate::repository::exercise_repository::ExerciseRepository;
use std::sync::Arc;

pub struct ExerciseService {
    repository: Arc<dyn ExerciseRepository>,
}

impl ExerciseService {
    pub fn new(repository: Arc<dyn ExerciseRepository>) -> Self {
        Self { repository }
    }

    pub fn create_exercise(&self, exercise: Exercise) -> Result<(), String> {
        self.repository.create(exercise)
    }

    pub fn list_exercises(&self) -> Vec<Exercise> {
        self.repository.list()
    }

    pub fn list_exercises_paginated(&self, page: i32, page_size: i32) -> Vec<Exercise> {
        self.repository.list_paginated(page, page_size)
    }

    pub fn delete_exercise(&self, id: i32) -> Result<(), String> {
        self.repository.delete(id)
    }

    pub fn update_exercise(&self, exercise: Exercise) -> Result<(), String> {
        self.repository.update(exercise)
    }

    pub fn search_exercises_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Exercise> {
        if query.trim().is_empty() {
            return Vec::new();
        }
        self.repository.search_paginated(query, page, page_size)
    }
} 