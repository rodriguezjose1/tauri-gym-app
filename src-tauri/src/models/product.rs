use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Product {
    pub id: Option<i64>,
    pub name: String,
    pub category: String,
    pub sale_price_cents: i64,
    pub is_active: bool,
    pub available_stock: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProductPage {
    pub products: Vec<Product>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StockReceipt {
    pub quantity: i64,
    pub unit_cost_cents: i64,
    pub received_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SaveProductRequest {
    pub product: Product,
    pub initial_stock: Option<StockReceipt>,
}
