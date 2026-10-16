use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutEntry {
    pub id: Option<i32>,
    pub person_id: i32,
    pub exercise_id: i32,
    pub date: String, // YYYY-MM-DD format
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>, // in kg
    pub notes: Option<String>,
    pub order_index: Option<i32>, // Order of exercise in the workout session
    pub group_number: Option<i32>, // Group number for organizing exercises
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutEntryWithDetails {
    pub id: Option<i32>,
    pub person_id: i32,
    pub exercise_id: i32,
    pub date: String,
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
    pub order_index: Option<i32>, // Order of exercise in the workout session
    pub group_number: Option<i32>, // Group number for organizing exercises
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // Joined data
    pub person_name: String,
    pub person_last_name: String,
    pub exercise_name: String,
    pub exercise_code: String,
}
