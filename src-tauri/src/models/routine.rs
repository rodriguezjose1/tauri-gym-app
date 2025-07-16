use crate::models::routine_exercise::RoutineExerciseWithDetails;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Routine {
    pub id: Option<i32>,
    pub name: String,
    pub code: String,
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