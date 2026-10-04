use crate::models::exercise::{Exercise, PaginatedExerciseResponse};
use crate::repository::exercise_repository::ExerciseRepository;
use std::sync::Arc;

pub struct ExerciseService {
    repository: Arc<dyn ExerciseRepository>,
}

impl ExerciseService {
    const MAX_PAGE_SIZE: i32 = 100;

    pub fn new(repository: Arc<dyn ExerciseRepository>) -> Self {
        Self { repository }
    }

    fn validate_exercise(exercise: &Exercise, require_id: bool) -> Result<(), String> {
        if require_id && exercise.id.filter(|id| *id > 0).is_none() {
            return Err("Exercise id is required".into());
        }
        if exercise.name.trim().is_empty() {
            return Err("Exercise name cannot be empty".into());
        }
        if exercise.code.trim().is_empty() {
            return Err("Exercise code cannot be empty".into());
        }
        Ok(())
    }

    fn validate_pagination(page: i32, page_size: i32) -> Result<(), String> {
        if page < 1 {
            return Err("Page must be greater than or equal to 1".into());
        }
        if !(1..=Self::MAX_PAGE_SIZE).contains(&page_size) {
            return Err(format!(
                "Page size must be between 1 and {}",
                Self::MAX_PAGE_SIZE
            ));
        }
        Ok(())
    }

    pub fn create_exercise(&self, exercise: Exercise) -> Result<(), String> {
        Self::validate_exercise(&exercise, false)?;
        self.repository.create(exercise)
    }

    pub fn list_exercises(&self) -> Result<Vec<Exercise>, String> {
        self.repository.list()
    }

    pub fn list_exercises_paginated(
        &self,
        page: i32,
        page_size: i32,
    ) -> Result<PaginatedExerciseResponse, String> {
        Self::validate_pagination(page, page_size)?;
        let exercises = self.repository.list_paginated(page, page_size)?;
        let total = self.repository.count()?;
        Ok(PaginatedExerciseResponse {
            exercises,
            total,
            page,
            page_size,
            total_pages: (total + page_size - 1) / page_size,
        })
    }

    pub fn delete_exercise(&self, id: i32) -> Result<(), String> {
        if id <= 0 {
            return Err("Invalid exercise id".into());
        }
        self.repository.delete(id)
    }

    pub fn restore_exercise(&self, id: i32) -> Result<(), String> {
        if id <= 0 {
            return Err("Invalid exercise id".into());
        }
        self.repository.restore(id)
    }

    pub fn update_exercise(&self, exercise: Exercise) -> Result<(), String> {
        Self::validate_exercise(&exercise, true)?;
        self.repository.update(exercise)
    }

    pub fn list_deleted_exercises(&self) -> Result<Vec<Exercise>, String> {
        self.repository.list_deleted()
    }
    pub fn count_deleted_exercises(&self) -> Result<i32, String> {
        self.repository.count_deleted()
    }

    pub fn search_exercises_paginated(
        &self,
        query: &str,
        page: i32,
        page_size: i32,
    ) -> Result<PaginatedExerciseResponse, String> {
        Self::validate_pagination(page, page_size)?;
        if query.trim().is_empty() {
            return Ok(PaginatedExerciseResponse {
                exercises: Vec::new(),
                total: 0,
                page,
                page_size,
                total_pages: 0,
            });
        }
        let exercises = self.repository.search_paginated(query, page, page_size)?;
        let total = self.repository.search_count(query)?;
        Ok(PaginatedExerciseResponse {
            exercises,
            total,
            page,
            page_size,
            total_pages: (total + page_size - 1) / page_size,
        })
    }
}
