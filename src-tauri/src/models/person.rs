use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Person {
    pub id: Option<i32>,
    pub name: String,
    pub last_name: String,
    pub phone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonDuplicateCandidate {
    pub person: Person,
    pub is_deleted: bool,
    pub same_name: bool,
    pub same_phone: bool,
    pub similar_name: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePersonOutcome {
    pub created: bool,
    pub duplicates: Vec<PersonDuplicateCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletedPerson {
    pub id: Option<i32>,
    pub name: String,
    pub last_name: String,
    pub phone: String,
    pub deleted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedPersonResponse {
    pub persons: Vec<Person>,
    pub total: i32,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedDeletedPersonResponse {
    pub persons: Vec<DeletedPerson>,
    pub total: i32,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
}
