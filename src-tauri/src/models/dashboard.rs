use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DashboardSummary {
    pub period: String,
    pub active_students: i64,
    pub collected_cents: i64,
    pub pending_payments: i64,
    pub overdue_payments: i64,
    pub registered_sessions: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RevenuePoint {
    pub period: String,
    pub amount_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StudentPoint {
    pub period: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StudentsTrend {
    pub available: bool,
    pub points: Vec<StudentPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PlanDistributionPoint {
    pub plan_id: Option<i64>,
    pub plan_name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InactiveStudent {
    pub person_id: i64,
    pub person_name: String,
    pub last_session_date: String,
    pub days_inactive: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InactiveStudentsPage {
    pub inactive_students_count: i64,
    pub max_days_inactive: Option<i64>,
    pub has_session_data: bool,
    pub items: Vec<InactiveStudent>,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}
