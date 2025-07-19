use std::sync::Arc;
use crate::models::routine::{Routine, RoutineWithExercises};
use crate::models::routine_exercise::{RoutineExercise, RoutineExerciseWithDetails};
use crate::repository::routine_repository::RoutineRepository;

pub struct RoutineService {
    repository: Arc<dyn RoutineRepository + Send + Sync>,
}

impl RoutineService {
    pub fn new(repository: Arc<dyn RoutineRepository + Send + Sync>) -> Self {
        Self { repository }
    }

    // Routine operations
    pub fn create_routine(&self, name: String, code: String) -> Result<i32, String> {
        // Validate input
        if name.trim().is_empty() {
            return Err("El nombre de la rutina no puede estar vacío".to_string());
        }
        if code.trim().is_empty() {
            return Err("El código de la rutina no puede estar vacío".to_string());
        }

        let routine = Routine::new(name.trim().to_string(), code.trim().to_uppercase());
        self.repository.create(routine)
    }

    pub fn get_routine_by_id(&self, id: i32) -> Option<Routine> {
        self.repository.get_by_id(id)
    }

    pub fn get_routine_with_exercises(&self, id: i32) -> Option<RoutineWithExercises> {
        self.repository.get_with_exercises(id)
    }

    pub fn update_routine(&self, id: i32, name: String, code: String) -> Result<(), String> {
        // Validate input
        if name.trim().is_empty() {
            return Err("El nombre de la rutina no puede estar vacío".to_string());
        }
        if code.trim().is_empty() {
            return Err("El código de la rutina no puede estar vacío".to_string());
        }

        self.repository.update(id, name.trim().to_string(), code.trim().to_uppercase())
    }

    pub fn delete_routine(&self, id: i32) -> Result<(), String> {
        self.repository.delete(id)
    }

    pub fn restore_routine(&self, id: i32) -> Result<(), String> {
        self.repository.restore(id)
    }

    pub fn list_routines(&self) -> Vec<Routine> {
        self.repository.list_all()
    }

    pub fn list_deleted_routines(&self) -> Vec<Routine> {
        self.repository.list_deleted()
    }

    pub fn count_deleted_routines(&self) -> i32 {
        self.repository.count_deleted()
    }

    pub fn list_routines_paginated(&self, page: i32, page_size: i32) -> Vec<Routine> {
        if page < 1 || page_size < 1 {
            return Vec::new();
        }
        self.repository.list_routines_paginated(page, page_size)
    }

    pub fn search_routines(&self, query: String) -> Vec<Routine> {
        if query.trim().is_empty() {
            return self.list_routines();
        }
        self.repository.search_routines(&query.trim())
    }

    pub fn search_routines_paginated(&self, query: String, page: i32, page_size: i32) -> Vec<Routine> {
        if page < 1 || page_size < 1 {
            return Vec::new();
        }
        if query.trim().is_empty() {
            return self.list_routines_paginated(page, page_size);
        }
        self.repository.search_routines_paginated(&query.trim(), page, page_size)
    }

    // Routine exercise operations
    pub fn add_exercise_to_routine(
        &self,
        routine_id: i32,
        exercise_id: i32,
        order_index: i32,
        sets: Option<i32>,
        reps: Option<i32>,
        weight: Option<f64>,
        notes: Option<String>,
        group_number: Option<i32>,
    ) -> Result<(), String> {
        // Validate that routine exists
        if self.repository.get_by_id(routine_id).is_none() {
            return Err("La rutina especificada no existe".to_string());
        }

        let routine_exercise = RoutineExercise::new(
            routine_id,
            exercise_id,
            order_index,
            sets,
            reps,
            weight,
            notes.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()),
            group_number,
        );

        self.repository.add_exercise_to_routine(routine_exercise)
    }

    pub fn update_routine_exercise(
        &self,
        id: i32,
        routine_id: i32,
        exercise_id: i32,
        order_index: i32,
        sets: Option<i32>,
        reps: Option<i32>,
        weight: Option<f64>,
        notes: Option<String>,
        group_number: Option<i32>,
    ) -> Result<(), String> {
        let routine_exercise = RoutineExercise {
            id: Some(id),
            routine_id,
            exercise_id,
            order_index,
            sets,
            reps,
            weight,
            notes: notes.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()),
            group_number,
            created_at: None,
            updated_at: None,
        };

        self.repository.update_routine_exercise(routine_exercise)
    }

    pub fn remove_exercise_from_routine(&self, routine_id: i32, exercise_id: i32) -> Result<(), String> {
        self.repository.remove_exercise_from_routine(routine_id, exercise_id)
    }

    pub fn get_routine_exercises(&self, routine_id: i32) -> Vec<RoutineExerciseWithDetails> {
        self.repository.get_routine_exercises(routine_id)
    }

    pub fn reorder_routine_exercises(&self, routine_id: i32, exercise_orders: Vec<(i32, i32)>) -> Result<(), String> {
        if exercise_orders.is_empty() {
            return Ok(());
        }

        self.repository.reorder_routine_exercises(routine_id, exercise_orders)
    }

    pub fn replace_routine_exercises(&self, routine_id: i32, exercises: Vec<RoutineExercise>) -> Result<(), String> {
        // Validate that routine exists
        if self.repository.get_by_id(routine_id).is_none() {
            return Err("La rutina especificada no existe".to_string());
        }

        self.repository.replace_routine_exercises(routine_id, exercises)
    }

    pub fn renumber_routine_groups(&self, routine_id: i32) -> Result<(), String> {
        if routine_id <= 0 {
            return Err("Invalid routine ID".to_string());
        }

        // Validate that routine exists
        if self.repository.get_by_id(routine_id).is_none() {
            return Err("La rutina especificada no existe".to_string());
        }

        self.repository.renumber_routine_groups(routine_id)
    }

    // Utility method to create a routine from an existing workout session
    pub fn create_routine_from_workout(
        &self,
        name: String,
        code: String,
        workout_exercises: Vec<(i32, Option<i32>, Option<i32>, Option<f64>, Option<String>, Option<i32>)>, // (exercise_id, sets, reps, weight, notes, group_number)
    ) -> Result<i32, String> {
        // Create the routine first
        let routine_id = self.create_routine(name, code)?;

        // Add exercises to the routine
        let routine_exercises: Vec<RoutineExercise> = workout_exercises
            .into_iter()
            .enumerate()
            .map(|(index, (exercise_id, sets, reps, weight, notes, group_number))| {
                RoutineExercise::new(
                    routine_id,
                    exercise_id,
                    index as i32,
                    sets,
                    reps,
                    weight,
                    notes,
                    group_number,
                )
            })
            .collect();

        if !routine_exercises.is_empty() {
            self.repository.replace_routine_exercises(routine_id, routine_exercises)?;
        }

        Ok(routine_id)
    }
} 