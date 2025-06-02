use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutEntry {
    pub id: Option<i32>,
    pub person_id: i32,
    pub exercise_id: i32,
    pub date: String,        // YYYY-MM-DD format
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>, // in kg
    pub notes: Option<String>,
    pub order: Option<i32>,  // Order of exercise in the workout session
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
    pub order: Option<i32>,  // Order of exercise in the workout session
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // Joined data
    pub person_name: String,
    pub person_last_name: String,
    pub exercise_name: String,
    pub exercise_code: String,
}

impl WorkoutEntry {
    pub fn new(
        person_id: i32,
        exercise_id: i32,
        date: String,
        sets: Option<i32>,
        reps: Option<i32>,
        weight: Option<f64>,
        notes: Option<String>,
    ) -> Self {
        Self {
            id: None,
            person_id,
            exercise_id,
            date,
            sets,
            reps,
            weight,
            notes,
            order: None,
            created_at: None,
            updated_at: None,
        }
    }
} 