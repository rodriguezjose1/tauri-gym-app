#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Person {
    pub id: Option<i32>,
    pub name: String,
    pub last_name: String,
    pub phone: String,
}
