use crate::models::exercise::{Exercise, PaginatedExerciseResponse};
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

    pub fn list_exercises_paginated(&self, page: i32, page_size: i32) -> PaginatedExerciseResponse {
        let exercises = self.repository.list_paginated(page, page_size);
        let total = self.repository.count();
        let total_pages = if page_size > 0 { (total + page_size - 1) / page_size } else { 0 };

        PaginatedExerciseResponse {
            exercises,
            total,
            page,
            page_size,
            total_pages,
        }
    }

    pub fn delete_exercise(&self, id: i32) -> Result<(), String> {
        self.repository.delete(id)
    }

    pub fn update_exercise(&self, exercise: Exercise) -> Result<(), String> {
        self.repository.update(exercise)
    }

    pub fn search_exercises_paginated(&self, query: &str, page: i32, page_size: i32) -> PaginatedExerciseResponse {
        if query.trim().is_empty() {
            return PaginatedExerciseResponse {
                exercises: Vec::new(),
                total: 0,
                page,
                page_size,
                total_pages: 0,
            };
        }
        
        let exercises = self.repository.search_paginated(query, page, page_size);
        let total = self.repository.search_count(query);
        let total_pages = if page_size > 0 { (total + page_size - 1) / page_size } else { 0 };

        PaginatedExerciseResponse {
            exercises,
            total,
            page,
            page_size,
            total_pages,
        }
    }
} 