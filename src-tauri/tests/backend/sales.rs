use crate::database_migrations::migrate_database;
use crate::models::product::{Product, SaveProductRequest, StockReceipt};
use crate::models::sale::{SaleRequest, SaleRequestItem};
use crate::product_service::ProductService;
use crate::sale_service::SaleService;
use crate::sqlite_product_repository::SqliteProductRepository;
use crate::sqlite_sale_repository::SqliteSaleRepository;
use rusqlite::Connection;
use std::sync::{Arc, Barrier};
use tempfile::tempdir;

fn services(path: &std::path::Path) -> (ProductService, SaleService) {
    let path = path.to_str().unwrap();
    (
        ProductService::new(Arc::new(SqliteProductRepository::new_safe(path).unwrap())),
        SaleService::new(Arc::new(SqliteSaleRepository::new_safe(path).unwrap())),
    )
}

fn create_product(products: &ProductService, name: &str, price: i64, batches: &[(i64, i64, &str)]) -> i64 {
    let saved = products.save(SaveProductRequest {
        product: Product { id: None, name: name.into(), category: String::new(), sale_price_cents: price, is_active: true, available_stock: 0 },
        initial_stock: None,
    }).unwrap();
    for (quantity, cost, date) in batches {
        products.receive_stock(saved.id.unwrap(), StockReceipt { quantity: *quantity, unit_cost_cents: *cost, received_at: Some((*date).into()) }).unwrap();
    }
    saved.id.unwrap()
}

fn request(product_id: i64, quantity: i64) -> SaleRequest {
    SaleRequest { buyer_person_id: None, payment_method: "cash".into(), items: vec![SaleRequestItem { product_id, quantity }] }
}

#[test]
fn registers_sale_with_fifo_across_batches_and_historical_cost() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("sales.sqlite");
    migrate_database(&path).unwrap();
    let (products, sales) = services(&path);
    let product_id = create_product(&products, "Proteína", 20000, &[(5, 10000, "2026-10-01"), (5, 12000, "2026-10-02")]);

    let sale = sales.register(request(product_id, 7)).unwrap();
    assert_eq!(sale.total_amount_cents, 140000);
    assert_eq!(sale.total_cost_cents, 74000);
    assert_eq!(sale.items[0].cost_total_cents, 74000);
    let connection = Connection::open(path).unwrap();
    let remaining = connection.prepare("SELECT remaining_quantity FROM stock_batches ORDER BY received_at,id").unwrap()
        .query_map([], |row| row.get::<_, i64>(0)).unwrap().collect::<Result<Vec<_>, _>>().unwrap();
    assert_eq!(remaining, vec![0, 3]);
    let allocations = connection.prepare("SELECT quantity,unit_cost_cents FROM sale_item_allocations ORDER BY id").unwrap()
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))).unwrap().collect::<Result<Vec<_>, _>>().unwrap();
    assert_eq!(allocations, vec![(5, 10000), (2, 12000)]);
}

#[test]
fn insufficient_stock_in_any_item_rolls_back_the_complete_sale() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("rollback.sqlite");
    migrate_database(&path).unwrap();
    let (products, sales) = services(&path);
    let first = create_product(&products, "Agua", 1000, &[(3, 500, "2026-10-01")]);
    let second = create_product(&products, "Barra", 2000, &[(1, 800, "2026-10-01")]);
    let error = sales.register(SaleRequest { buyer_person_id: None, payment_method: "transfer".into(), items: vec![SaleRequestItem { product_id: first, quantity: 2 }, SaleRequestItem { product_id: second, quantity: 2 }] }).unwrap_err();
    assert!(error.contains("Stock insuficiente"));
    let connection = Connection::open(path).unwrap();
    assert_eq!(connection.query_row("SELECT COUNT(*) FROM sales", [], |row| row.get::<_, i64>(0)).unwrap(), 0);
    assert_eq!(connection.query_row("SELECT SUM(remaining_quantity) FROM stock_batches", [], |row| row.get::<_, i64>(0)).unwrap(), 4);
}

#[test]
fn snapshots_current_price_and_buyer_name() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("snapshot.sqlite");
    migrate_database(&path).unwrap();
    let (products, sales) = services(&path);
    let product_id = create_product(&products, "Remera", 30000, &[(2, 10000, "2026-10-01")]);
    let connection = Connection::open(&path).unwrap();
    connection.execute("INSERT INTO people(name,last_name,phone) VALUES('Ana','Pérez','1')", []).unwrap();
    drop(connection);
    let sale = sales.register(SaleRequest { buyer_person_id: Some(1), payment_method: "other".into(), items: vec![SaleRequestItem { product_id, quantity: 1 }] }).unwrap();
    assert_eq!(sale.buyer_name.as_deref(), Some("Ana Pérez"));
    assert_eq!(sale.items[0].unit_price_cents, 30000);
}

#[test]
fn concurrent_sales_cannot_oversell_the_last_unit() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("concurrent.sqlite");
    migrate_database(&path).unwrap();
    let (products, _) = services(&path);
    let product_id = create_product(&products, "Última unidad", 1000, &[(1, 500, "2026-10-01")]);
    let barrier = Arc::new(Barrier::new(3));
    let mut handles = Vec::new();
    for _ in 0..2 {
        let path = path.clone();
        let barrier = Arc::clone(&barrier);
        handles.push(std::thread::spawn(move || {
            let (_, sales) = services(&path);
            barrier.wait();
            sales.register(request(product_id, 1))
        }));
    }
    barrier.wait();
    let results = handles.into_iter().map(|handle| handle.join().unwrap()).collect::<Vec<_>>();
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    assert_eq!(Connection::open(path).unwrap().query_row("SELECT remaining_quantity FROM stock_batches", [], |row| row.get::<_, i64>(0)).unwrap(), 0);
}
