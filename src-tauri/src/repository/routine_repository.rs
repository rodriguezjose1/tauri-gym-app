use crate::models::routine::{Routine, RoutineWithExercises};
use crate::models::routine_exercise::{RoutineExercise, RoutineExerciseWithDetails};

pub trait RoutineRepository: Send + Sync {
    fn create(&self, routine: Routine) -> Result<i32, String>;
    fn get_by_id(&self, id: i32) -> Option<Routine>;
    fn get_with_exercises(&self, id: i32) -> Option<RoutineWithExercises>;
    fn update(&self, id: i32, name: String, code: String) -> Result<(), String>;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn list_all(&self) -> Vec<Routine>;
    fn list_routines_paginated(&self, page: i32, page_size: i32) -> Vec<Routine>;
    fn search_routines(&self, query: &str) -> Vec<Routine>;
    fn search_routines_paginated(&self, query: &str, page: i32, page_size: i32) -> Vec<Routine>;
    fn add_exercise_to_routine(&self, routine_exercise: RoutineExercise) -> Result<(), String>;
    fn update_routine_exercise(&self, routine_exercise: RoutineExercise) -> Result<(), String>;
    fn remove_exercise_from_routine(&self, routine_id: i32, exercise_id: i32) -> Result<(), String>;
    fn get_routine_exercises(&self, routine_id: i32) -> Vec<RoutineExerciseWithDetails>;
    fn reorder_routine_exercises(&self, routine_id: i32, exercise_orders: Vec<(i32, i32)>) -> Result<(), String>;
    fn replace_routine_exercises(&self, routine_id: i32, exercises: Vec<RoutineExercise>) -> Result<(), String>;
    fn renumber_routine_groups(&self, routine_id: i32) -> Result<(), String>;
} 