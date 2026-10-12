use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub id: Option<i64>,
    pub name: String,
    pub modality: String,
    pub price_cents: i64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Obligation {
    pub id: i64,
    pub person_id: i64,
    pub period: String,
    pub plan_id: i64,
    pub amount_cents: i64,
    pub paid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: i64,
    pub person_id: i64,
    pub obligation_id: Option<i64>,
    pub plan_id: i64,
    pub plan_name: String,
    pub modality: String,
    pub period: Option<String>,
    pub amount_cents: i64,
    pub paid_at: String,
    pub reversed_at: Option<String>,
    pub reversal_reason: Option<String>,
    pub person_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentPage {
    pub payments: Vec<Payment>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
    pub collected_cents: i64,
    pub payment_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentQuote {
    pub plan_id: Option<i64>,
    pub amount_cents: Option<i64>,
    pub already_paid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRequest {
    pub person_id: i64,
    pub modality: String,
    pub period: Option<String>,
    pub plan_id: i64,
    pub amount_cents: i64,
}
