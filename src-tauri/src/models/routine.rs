#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Routine {
    pub id: Option<i32>,
    pub name: String,
    pub code: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoutineExercise {
    pub id: Option<i32>,
    pub routine_id: i32,
    pub exercise_id: i32,
    pub order_index: i32,
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoutineWithExercises {
    pub id: Option<i32>,
    pub name: String,
    pub code: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub exercises: Vec<RoutineExerciseWithDetails>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoutineExerciseWithDetails {
    pub id: Option<i32>,
    pub routine_id: i32,
    pub exercise_id: i32,
    pub order_index: i32,
    pub sets: Option<i32>,
    pub reps: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // Joined data from exercise table
    pub exercise_name: String,
    pub exercise_code: String,
}

impl Routine {
    pub fn new(name: String, code: String) -> Self {
        Self {
            id: None,
            name,
            code,
            created_at: None,
            updated_at: None,
        }
    }
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
            created_at: None,
            updated_at: None,
        }
    }
} 