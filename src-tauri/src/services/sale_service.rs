use crate::models::sale::{SalePage, SaleRequest, SaleResult};
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

    pub fn page(
        &self,
        month: &str,
        query: &str,
        status: &str,
        page: i64,
    ) -> Result<SalePage, String> {
        if !is_valid_month(month) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        if !matches!(status, "all" | "active" | "voided") {
            return Err("Estado de venta inválido".into());
        }
        if page <= 0 {
            return Err("La página debe ser mayor que cero".into());
        }
        self.repository.page(month, query.trim(), status, page, 20)
    }

    pub fn get(&self, id: i64) -> Result<SaleResult, String> {
        if id <= 0 {
            return Err("Venta inválida".into());
        }
        self.repository.get(id)
    }

    pub fn void(&self, id: i64, reason: &str) -> Result<(), String> {
        if id <= 0 {
            return Err("Venta inválida".into());
        }
        let reason = reason.trim();
        if reason.is_empty() {
            return Err("El motivo de anulación es obligatorio".into());
        }
        self.repository.void_sale(id, reason)
    }
}

fn is_valid_month(value: &str) -> bool {
    let bytes = value.as_bytes();
    value.len() == 7
        && bytes[4] == b'-'
        && value[..4].parse::<i32>().is_ok()
        && matches!(value[5..].parse::<u8>(), Ok(1..=12))
}
