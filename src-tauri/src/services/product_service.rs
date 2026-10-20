use crate::models::product::{Product, ProductPage, SaveProductRequest, StockReceipt};
use crate::repository::product_repository::ProductRepository;
use std::sync::Arc;

pub struct ProductService {
    repository: Arc<dyn ProductRepository>,
}

impl ProductService {
    pub fn new(repository: Arc<dyn ProductRepository>) -> Self {
        Self { repository }
    }

    fn validate_product(product: &mut Product) -> Result<(), String> {
        product.name = product.name.trim().to_string();
        product.category.clear();
        if product.name.is_empty() {
            return Err("El nombre del producto es obligatorio".into());
        }
        if product.sale_price_cents <= 0 {
            return Err("El precio de venta debe ser mayor a cero".into());
        }
        Ok(())
    }

    fn validate_receipt(receipt: &StockReceipt) -> Result<(), String> {
        if receipt.quantity <= 0 {
            return Err("La cantidad debe ser mayor a cero".into());
        }
        if receipt.unit_cost_cents < 0 {
            return Err("El costo unitario no puede ser negativo".into());
        }
        if let Some(value) = &receipt.received_at {
            if !Self::valid_date(value) {
                return Err(
                    "La fecha de ingreso debe ser una fecha válida con formato AAAA-MM-DD".into(),
                );
            }
        }
        Ok(())
    }

    fn valid_date(value: &str) -> bool {
        let bytes = value.as_bytes();
        if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
            return false;
        }
        let Ok(year) = value[0..4].parse::<i32>() else {
            return false;
        };
        let Ok(month) = value[5..7].parse::<u8>() else {
            return false;
        };
        let Ok(day) = value[8..10].parse::<u8>() else {
            return false;
        };
        if year < 1 || !(1..=12).contains(&month) {
            return false;
        }
        let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
        let max_day = match month {
            2 if leap => 29,
            2 => 28,
            4 | 6 | 9 | 11 => 30,
            _ => 31,
        };
        (1..=max_day).contains(&day)
    }

    pub fn save(&self, mut request: SaveProductRequest) -> Result<Product, String> {
        Self::validate_product(&mut request.product)?;
        if request.product.id.is_some() && request.initial_stock.is_some() {
            return Err("El stock inicial sólo corresponde a productos nuevos".into());
        }
        if let Some(receipt) = &request.initial_stock {
            Self::validate_receipt(receipt)?;
        }
        self.repository.save(request.product, request.initial_stock)
    }

    pub fn page(&self, query: &str, page: i64, page_size: i64) -> Result<ProductPage, String> {
        if page < 1 || !(1..=100).contains(&page_size) {
            return Err("Parámetros de paginación inválidos".into());
        }
        self.repository.page(query.trim(), page, page_size)
    }

    pub fn receive_stock(&self, product_id: i64, receipt: StockReceipt) -> Result<(), String> {
        if product_id <= 0 {
            return Err("Producto inválido".into());
        }
        Self::validate_receipt(&receipt)?;
        self.repository.receive_stock(product_id, receipt)
    }
}
