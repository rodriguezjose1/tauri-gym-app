use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutineExercise {
    pub id: Option<i32>,
    pub routine_id: i32,
    pub exercise_id: i32,
    pub order_index: i32,
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
    pub group_number: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutineExerciseWithDetails {
    pub id: Option<i32>,
    pub routine_id: i32,
    pub exercise_id: i32,
    pub order_index: i32,
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
    pub group_number: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub exercise_name: String,
    pub exercise_code: String,
}

impl RoutineExercise {
    pub fn new(
        routine_id: i32,
        exercise_id: i32,
        order_index: i32,
        sets: Option<i32>,
        reps: Option<i32>,
        weight: Option<f64>,
        notes: Option<String>,
        group_number: Option<i32>,
    ) -> Self {
        Self {
            id: None,
            routine_id,
            exercise_id,
            order_index,
            sets,
            reps,
            weight,
            notes,
            group_number,
            created_at: None,
            updated_at: None,
        }
    }
} 