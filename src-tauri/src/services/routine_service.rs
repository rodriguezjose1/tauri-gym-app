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

    // Validate that routine groups are consecutive
    fn validate_routine_groups_consecutive(&self, routine_id: i32) -> Result<(), String> {
        println!("DEBUG: validate_routine_groups_consecutive called for routine_id: {}", routine_id);
        
        let exercises = self.repository.get_routine_exercises(routine_id);
        println!("DEBUG: Found {} exercises in routine", exercises.len());
        
        let groups: std::collections::HashSet<i32> = exercises
            .iter()
            .map(|e| e.group_number.unwrap_or(1))
            .collect();
        
        println!("DEBUG: Groups found: {:?}", groups);
        
        if groups.is_empty() {
            println!("DEBUG: No groups found, returning Ok");
            return Ok(());
        }
        
        let min_group = groups.iter().min().unwrap();
        let max_group = groups.iter().max().unwrap();
        
        println!("DEBUG: Min group: {}, Max group: {}", min_group, max_group);
        
        // First exercise must always be in group 1
        if *min_group != 1 {
            let error_msg = format!(
                "⚠️ El primer ejercicio debe estar en el grupo 1. No puedes empezar en el grupo {}.",
                min_group
            );
            println!("DEBUG: Validation failed: {}", error_msg);
            return Err(error_msg);
        }
        
        // Check that all groups from min to max exist
        for group_num in *min_group..=*max_group {
            if !groups.contains(&group_num) {
                let error_msg = format!(
                    "⚠️ No puedes saltar grupos. Agrega primero un ejercicio al grupo {}.",
                    group_num
                );
                println!("DEBUG: Validation failed: {}", error_msg);
                return Err(error_msg);
            }
        }
        
        println!("DEBUG: Validation passed, groups are consecutive");
        Ok(())
    }

    // Validate that routine groups are consecutive WITH a new group (before adding)
    fn validate_routine_groups_consecutive_with_new_group(&self, routine_id: i32, new_group_number: Option<i32>) -> Result<(), String> {
        println!("DEBUG: validate_routine_groups_consecutive_with_new_group called for routine_id: {} with new_group: {:?}", routine_id, new_group_number);
        
        let exercises = self.repository.get_routine_exercises(routine_id);
        println!("DEBUG: Found {} exercises in routine", exercises.len());
        
        let mut groups: std::collections::HashSet<i32> = exercises
            .iter()
            .map(|e| e.group_number.unwrap_or(1))
            .collect();
        
        // Add the new group to the set for validation
        if let Some(new_group) = new_group_number {
            groups.insert(new_group);
        }
        
        println!("DEBUG: Groups found (including new group): {:?}", groups);
        
        if groups.is_empty() {
            println!("DEBUG: No groups found, returning Ok");
            return Ok(());
        }
        
        let min_group = groups.iter().min().unwrap();
        let max_group = groups.iter().max().unwrap();
        
        println!("DEBUG: Min group: {}, Max group: {}", min_group, max_group);
        
        // First exercise must always be in group 1
        if *min_group != 1 {
            let error_msg = format!(
                "⚠️ El primer ejercicio debe estar en el grupo 1. No puedes empezar en el grupo {}.",
                min_group
            );
            println!("DEBUG: Validation failed: {}", error_msg);
            return Err(error_msg);
        }
        
        // Check that all groups from min to max exist
        for group_num in *min_group..=*max_group {
            if !groups.contains(&group_num) {
                let error_msg = format!(
                    "⚠️ No puedes saltar grupos. Agrega primero un ejercicio al grupo {}.",
                    group_num
                );
                println!("DEBUG: Validation failed: {}", error_msg);
                return Err(error_msg);
            }
        }
        
        println!("DEBUG: Validation passed, groups are consecutive");
        Ok(())
    }

    pub fn get_available_groups(&self, routine_id: i32) -> Result<Vec<i32>, String> {
        // Validate that routine exists
        if self.repository.get_by_id(routine_id).is_none() {
            return Err("La rutina especificada no existe".to_string());
        }

        // Always return all groups from 1 to 5 for selection
        Ok(vec![1, 2, 3, 4, 5])
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
        println!("DEBUG: add_exercise_to_routine called with group_number: {:?}", group_number);
        
        // Validate that routine exists
        if self.repository.get_by_id(routine_id).is_none() {
            return Err("La rutina especificada no existe".to_string());
        }

        // Basic validation for group number
        if let Some(group_num) = group_number {
            if group_num <= 0 || group_num > 5 {
                return Err("El número de grupo debe estar entre 1 y 5".to_string());
            }
        }

        // Validate consecutiveness BEFORE adding
        println!("DEBUG: About to validate consecutive groups BEFORE adding");
        let validation_result = self.validate_routine_groups_consecutive_with_new_group(routine_id, group_number);
        println!("DEBUG: Validation result: {:?}", validation_result);
        validation_result?;

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

        println!("DEBUG: About to add exercise to repository");
        self.repository.add_exercise_to_routine(routine_exercise)?;
        println!("DEBUG: Exercise added to repository successfully");

        Ok(())
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
        // Basic validation for group number
        if let Some(group_num) = group_number {
            if group_num <= 0 || group_num > 5 {
                return Err("El número de grupo debe estar entre 1 y 5".to_string());
            }
        }

        // Validate consecutiveness BEFORE updating
        let validation_result = self.validate_routine_groups_consecutive_with_new_group(routine_id, group_number);
        validation_result?;

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

        self.repository.update_routine_exercise(routine_exercise)?;

        Ok(())
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