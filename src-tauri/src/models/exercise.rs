#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Exercise {
    pub id: Option<i32>,
    pub name: String,
    pub code: String,
} 