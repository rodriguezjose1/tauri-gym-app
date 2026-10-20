use crate::database_migrations::migrate_database;
use crate::models::product::{Product, SaveProductRequest, StockReceipt};
use crate::product_service::ProductService;
use crate::sqlite_product_repository::SqliteProductRepository;
use rusqlite::Connection;
use std::sync::Arc;
use tempfile::tempdir;

fn fixture() -> (tempfile::TempDir, std::path::PathBuf, ProductService) {
    let directory = tempdir().unwrap();
    let path = directory.path().join("products.sqlite");
    migrate_database(&path).unwrap();
    let service = ProductService::new(Arc::new(SqliteProductRepository::new_safe(path.to_str().unwrap()).unwrap()));
    (directory, path, service)
}

fn product(name: &str) -> Product {
    Product { id: None, name: name.into(), category: String::new(), sale_price_cents: 250000, is_active: true, available_stock: 0 }
}

#[test]
fn creates_product_and_initial_stock_atomically() {
    let (_directory, path, service) = fixture();
    let saved = service.save(SaveProductRequest { product: product("Proteína"), initial_stock: Some(StockReceipt { quantity: 5, unit_cost_cents: 100000, received_at: Some("2026-10-19".into()) }) }).unwrap();
    let page = service.page("", 1, 8).unwrap();
    assert_eq!(page.products[0].available_stock, 5);
    assert_eq!(page.products[0].category, "");
    assert_eq!(page.products[0].id, saved.id);
    let batch: (i64, i64, i64, String) = Connection::open(path).unwrap().query_row("SELECT received_quantity,remaining_quantity,unit_cost_cents,received_at FROM stock_batches", [], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))).unwrap();
    assert_eq!(batch, (5, 5, 100000, "2026-10-19".into()));
}

#[test]
fn replenishments_create_independent_batches_and_stock_is_aggregated() {
    let (_directory, path, service) = fixture();
    let saved = service.save(SaveProductRequest { product: product("Creatina"), initial_stock: Some(StockReceipt { quantity: 5, unit_cost_cents: 10000, received_at: None }) }).unwrap();
    service.receive_stock(saved.id.unwrap(), StockReceipt { quantity: 7, unit_cost_cents: 12000, received_at: None }).unwrap();
    assert_eq!(service.page("crea", 1, 8).unwrap().products[0].available_stock, 12);
    let count: i64 = Connection::open(path).unwrap().query_row("SELECT COUNT(*) FROM stock_batches", [], |row| row.get(0)).unwrap();
    assert_eq!(count, 2);
}

#[test]
fn validates_inputs_and_preserves_stock_when_product_is_edited_or_disabled() {
    let (_directory, _path, service) = fixture();
    assert!(service.save(SaveProductRequest { product: product("  "), initial_stock: None }).is_err());
    let mut saved = service.save(SaveProductRequest { product: product("Remera"), initial_stock: Some(StockReceipt { quantity: 3, unit_cost_cents: 5000, received_at: None }) }).unwrap();
    saved.sale_price_cents = 300000;
    saved.is_active = false;
    service.save(SaveProductRequest { product: saved, initial_stock: None }).unwrap();
    let result = service.page("", 1, 8).unwrap().products.remove(0);
    assert!(!result.is_active);
    assert_eq!(result.available_stock, 3);
    assert_eq!(result.sale_price_cents, 300000);
}

#[test]
fn duplicate_name_rolls_back_initial_stock() {
    let (_directory, path, service) = fixture();
    service.save(SaveProductRequest { product: product("Barra"), initial_stock: None }).unwrap();
    let error = service.save(SaveProductRequest { product: product("barra"), initial_stock: Some(StockReceipt { quantity: 2, unit_cost_cents: 100, received_at: None }) }).unwrap_err();
    assert_eq!(error, "Ya existe un producto con ese nombre");
    let batches: i64 = Connection::open(path).unwrap().query_row("SELECT COUNT(*) FROM stock_batches", [], |row| row.get(0)).unwrap();
    assert_eq!(batches, 0);
}

#[test]
fn records_initial_price_and_only_real_price_changes() {
    let (_directory, path, service) = fixture();
    let mut saved = service.save(SaveProductRequest { product: product("Proteína"), initial_stock: None }).unwrap();

    saved.name = "Proteína premium".into();
    service.save(SaveProductRequest { product: saved.clone(), initial_stock: None }).unwrap();
    saved.sale_price_cents = 275000;
    service.save(SaveProductRequest { product: saved, initial_stock: None }).unwrap();

    let connection = Connection::open(path).unwrap();
    let prices = connection.prepare("SELECT price_cents FROM product_price_history ORDER BY id").unwrap()
        .query_map([], |row| row.get::<_, i64>(0)).unwrap()
        .collect::<Result<Vec<_>, _>>().unwrap();
    assert_eq!(prices, vec![250000, 275000]);
}

#[test]
fn rejects_invalid_calendar_dates_without_creating_a_batch() {
    let (_directory, path, service) = fixture();
    let saved = service.save(SaveProductRequest { product: product("Agua"), initial_stock: None }).unwrap();
    let error = service.receive_stock(saved.id.unwrap(), StockReceipt {
        quantity: 2,
        unit_cost_cents: 100,
        received_at: Some("2026-02-30".into()),
    }).unwrap_err();
    assert!(error.contains("fecha válida"));
    let batches: i64 = Connection::open(path).unwrap().query_row(
        "SELECT COUNT(*) FROM stock_batches",
        [],
        |row| row.get(0),
    ).unwrap();
    assert_eq!(batches, 0);
}

#[test]
fn accepts_leap_day_and_rejects_it_on_non_leap_years() {
    let (_directory, _path, service) = fixture();
    let saved = service.save(SaveProductRequest { product: product("Toalla"), initial_stock: None }).unwrap();
    service.receive_stock(saved.id.unwrap(), StockReceipt {
        quantity: 1,
        unit_cost_cents: 0,
        received_at: Some("2028-02-29".into()),
    }).unwrap();
    assert!(service.receive_stock(saved.id.unwrap(), StockReceipt {
        quantity: 1,
        unit_cost_cents: 0,
        received_at: Some("2027-02-29".into()),
    }).is_err());
}
