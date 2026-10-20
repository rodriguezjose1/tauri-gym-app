use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SaleRequestItem {
    pub product_id: i64,
    pub quantity: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SaleRequest {
    pub buyer_person_id: Option<i64>,
    pub payment_method: String,
    pub items: Vec<SaleRequestItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SaleItemResult {
    pub product_id: i64,
    pub product_name: String,
    pub quantity: i64,
    pub unit_price_cents: i64,
    pub line_total_cents: i64,
    pub cost_total_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SaleResult {
    pub id: i64,
    pub buyer_name: Option<String>,
    pub payment_method: String,
    pub total_amount_cents: i64,
    pub total_cost_cents: i64,
    pub sold_at: String,
    pub items: Vec<SaleItemResult>,
}
