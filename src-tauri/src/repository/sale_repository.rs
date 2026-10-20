use crate::models::sale::{SaleRequest, SaleResult};

pub trait SaleRepository: Send + Sync {
    fn register(&self, request: SaleRequest) -> Result<SaleResult, String>;
}
