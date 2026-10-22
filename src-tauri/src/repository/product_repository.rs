use crate::models::product::{Product, ProductPage, StockReceipt};

pub trait ProductRepository: Send + Sync {
    fn save(
        &self,
        product: Product,
        initial_stock: Option<StockReceipt>,
    ) -> Result<Product, String>;
    fn page(&self, query: &str, page: i64, page_size: i64) -> Result<ProductPage, String>;
    fn list_active(&self) -> Result<Vec<Product>, String>;
    fn receive_stock(&self, product_id: i64, receipt: StockReceipt) -> Result<(), String>;
}
