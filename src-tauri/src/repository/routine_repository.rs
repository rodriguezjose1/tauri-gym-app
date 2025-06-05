use crate::models::routine::{Routine, RoutineExercise, RoutineWithExercises, RoutineExerciseWithDetails};

pub trait RoutineRepository: Send + Sync {
    // Routine CRUD operations
    fn create_routine(&self, routine: Routine) -> Result<i32, String>; // Returns the created routine ID
    fn get_routine_by_id(&self, id: i32) -> Option<Routine>;
    fn get_routine_with_exercises(&self, id: i32) -> Option<RoutineWithExercises>;
    fn update_routine(&self, routine: Routine) -> Result<(), String>;
    fn delete_routine(&self, id: i32) -> Result<(), String>;
    fn list_routines(&self) -> Vec<Routine>;
    fn list_routines_paginated(&self, page: i32, page_size: i32) -> Vec<Routine>;
    fn search_routines(&self, query: &str) -> Vec<Routine>;
    fn search_routines_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Routine>;
    
    // Routine Exercise CRUD operations
    fn add_exercise_to_routine(&self, routine_exercise: RoutineExercise) -> Result<(), String>;
    fn update_routine_exercise(&self, routine_exercise: RoutineExercise) -> Result<(), String>;
    fn remove_exercise_from_routine(&self, routine_id: i32, exercise_id: i32) -> Result<(), String>;
    fn get_routine_exercises(&self, routine_id: i32) -> Vec<RoutineExerciseWithDetails>;
    fn reorder_routine_exercises(&self, routine_id: i32, exercise_orders: Vec<(i32, i32)>) -> Result<(), String>; // (exercise_id, new_order)
    fn replace_routine_exercises(&self, routine_id: i32, exercises: Vec<RoutineExercise>) -> Result<(), String>;
} 