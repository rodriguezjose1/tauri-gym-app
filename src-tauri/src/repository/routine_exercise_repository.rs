use crate::models::routine_exercise::{RoutineExercise, RoutineExerciseWithDetails};

pub trait RoutineExerciseRepository {
    fn create(&self, routine_exercise: RoutineExercise) -> Result<(), String>;
    fn get_by_routine_id(&self, routine_id: i32) -> Vec<RoutineExerciseWithDetails>;
    fn update(&self, routine_exercise: RoutineExercise) -> Result<(), String>;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn delete_by_routine_and_exercise(&self, routine_id: i32, exercise_id: i32) -> Result<(), String>;
    fn update_order(&self, exercise_orders: Vec<(i32, i32)>) -> Result<(), String>;
    fn replace_routine_exercises(&self, routine_id: i32, exercises: Vec<RoutineExercise>) -> Result<(), String>;
} 