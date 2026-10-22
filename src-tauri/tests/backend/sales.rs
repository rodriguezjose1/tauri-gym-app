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

#[test]
fn lists_details_filters_and_voids_restoring_original_batches_once() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("history.sqlite");
    migrate_database(&path).unwrap();
    let (products, sales) = services(&path);
    let product_id = create_product(&products, "Proteína aislada", 20000, &[(2, 9000, "2026-09-01"), (3, 11000, "2026-09-02")]);
    let sale = sales.register(request(product_id, 4)).unwrap();
    let connection = Connection::open(&path).unwrap();
    connection.execute("UPDATE sales SET sold_at='2026-10-10 12:00:00' WHERE id=?1", [sale.id]).unwrap();
    drop(connection);

    let page = sales.page("2026-10", "proteina aislada", "active", 1).unwrap();
    assert_eq!(page.total, 1);
    assert_eq!(page.sales[0].id, sale.id);
    assert_eq!(sales.page("2026-10", "", "all", 99).unwrap().page, 1);
    let detail = sales.get(sale.id).unwrap();
    assert_eq!(detail.items[0].cost_total_cents, 40000);

    sales.void(sale.id, "Venta duplicada").unwrap();
    let detail = sales.get(sale.id).unwrap();
    assert_eq!(detail.void_reason.as_deref(), Some("Venta duplicada"));
    let connection = Connection::open(&path).unwrap();
    let remaining = connection.prepare("SELECT remaining_quantity FROM stock_batches ORDER BY received_at,id").unwrap()
        .query_map([], |row| row.get::<_, i64>(0)).unwrap().collect::<Result<Vec<_>, _>>().unwrap();
    assert_eq!(remaining, vec![2, 3]);
    assert_eq!(sales.page("2026-10", "", "active", 1).unwrap().total, 0);
    assert_eq!(sales.page("2026-10", "", "voided", 1).unwrap().total, 1);
    assert_eq!(sales.void(sale.id, "Otra vez").unwrap_err(), "La venta ya fue anulada");
}

#[test]
fn concurrent_voids_restore_stock_exactly_once() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("concurrent-void.sqlite");
    migrate_database(&path).unwrap();
    let (products, sales) = services(&path);
    let product_id = create_product(&products, "Creatina", 15000, &[(5, 8000, "2026-10-01")]);
    let sale_id = sales.register(request(product_id, 4)).unwrap().id;
    let barrier = Arc::new(Barrier::new(3));
    let mut handles = Vec::new();

    for _ in 0..2 {
        let path = path.clone();
        let barrier = Arc::clone(&barrier);
        handles.push(std::thread::spawn(move || {
            let (_, sales) = services(&path);
            barrier.wait();
            sales.void(sale_id, "Carga duplicada")
        }));
    }

    barrier.wait();
    let results = handles.into_iter().map(|handle| handle.join().unwrap()).collect::<Vec<_>>();
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    assert_eq!(results.iter().filter(|result| result.as_ref().is_err_and(|error| error == "La venta ya fue anulada")).count(), 1);
    let connection = Connection::open(path).unwrap();
    assert_eq!(connection.query_row("SELECT remaining_quantity FROM stock_batches", [], |row| row.get::<_, i64>(0)).unwrap(), 5);
}

#[test]
fn void_failure_rolls_back_every_restored_batch_and_keeps_sale_active() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("void-rollback.sqlite");
    migrate_database(&path).unwrap();
    let (products, sales) = services(&path);
    let product_id = create_product(&products, "Proteína", 20000, &[(2, 9000, "2026-10-01"), (2, 11000, "2026-10-02")]);
    let sale_id = sales.register(request(product_id, 3)).unwrap().id;
    let connection = Connection::open(&path).unwrap();
    let missing_batch: i64 = connection.query_row("SELECT id FROM stock_batches ORDER BY id DESC LIMIT 1", [], |row| row.get(0)).unwrap();
    connection.execute("PRAGMA foreign_keys=OFF", []).unwrap();
    connection.execute("DELETE FROM stock_batches WHERE id=?1", [missing_batch]).unwrap();
    drop(connection);

    assert_eq!(sales.void(sale_id, "Forzar rollback").unwrap_err(), "No se pudo restaurar el lote original");
    let connection = Connection::open(path).unwrap();
    assert_eq!(connection.query_row("SELECT remaining_quantity FROM stock_batches", [], |row| row.get::<_, i64>(0)).unwrap(), 0);
    assert!(connection.query_row("SELECT voided_at FROM sales WHERE id=?1", [sale_id], |row| row.get::<_, Option<String>>(0)).unwrap().is_none());
}

#[test]
fn detail_keeps_historical_names_prices_and_costs_after_catalog_changes() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("historical-detail.sqlite");
    migrate_database(&path).unwrap();
    let (products, sales) = services(&path);
    let product_id = create_product(&products, "Remera original", 30000, &[(2, 12000, "2026-10-01")]);
    let connection = Connection::open(&path).unwrap();
    connection.execute("INSERT INTO people(name,last_name,phone) VALUES('Ana','Pérez','1')", []).unwrap();
    drop(connection);
    let sale_id = sales.register(SaleRequest { buyer_person_id: Some(1), payment_method: "cash".into(), items: vec![SaleRequestItem { product_id, quantity: 1 }] }).unwrap().id;

    let connection = Connection::open(&path).unwrap();
    connection.execute("UPDATE products SET name='Remera nueva',sale_price_cents=99000,is_active=0 WHERE id=?1", [product_id]).unwrap();
    connection.execute("UPDATE people SET name='Nombre',last_name='Modificado',deleted_at=datetime('now') WHERE id=1", []).unwrap();
    drop(connection);

    let detail = sales.get(sale_id).unwrap();
    assert_eq!(detail.buyer_name.as_deref(), Some("Ana Pérez"));
    assert_eq!(detail.items[0].product_name, "Remera original");
    assert_eq!(detail.items[0].unit_price_cents, 30000);
    assert_eq!(detail.items[0].cost_total_cents, 12000);
}
