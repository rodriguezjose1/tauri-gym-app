use crate::models::sale::{SalePage, SaleRequest, SaleResult};

pub trait SaleRepository: Send + Sync {
    fn register(&self, request: SaleRequest) -> Result<SaleResult, String>;
    fn page(
        &self,
        month: &str,
        query: &str,
        status: &str,
        page: i64,
        page_size: i64,
    ) -> Result<SalePage, String>;
    fn get(&self, id: i64) -> Result<SaleResult, String>;
    fn void_sale(&self, id: i64, reason: &str) -> Result<(), String>;
}
