use crate::models::sale::{SaleRequest, SaleResult};
use crate::repository::sale_repository::SaleRepository;
use std::collections::HashSet;
use std::sync::Arc;

pub struct SaleService {
    repository: Arc<dyn SaleRepository>,
}

impl SaleService {
    pub fn new(repository: Arc<dyn SaleRepository>) -> Self {
        Self { repository }
    }

    pub fn register(&self, request: SaleRequest) -> Result<SaleResult, String> {
        if !matches!(
            request.payment_method.as_str(),
            "cash" | "transfer" | "other"
        ) {
            return Err("Medio de pago inválido".into());
        }
        if request.items.is_empty() {
            return Err("La venta debe incluir al menos un producto".into());
        }
        let mut products = HashSet::new();
        for item in &request.items {
            if item.product_id <= 0 || item.quantity <= 0 {
                return Err("Los productos y cantidades deben ser válidos".into());
            }
            if !products.insert(item.product_id) {
                return Err("Un producto no puede repetirse en la venta".into());
            }
        }
        self.repository.register(request)
    }
}
