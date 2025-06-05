use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Exercise {
    pub id: Option<i32>,
    pub name: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedExerciseResponse {
    pub exercises: Vec<Exercise>,
    pub total: i32,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
} 