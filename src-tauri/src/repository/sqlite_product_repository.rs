use crate::config::search::{normalize_search_text, register_search_normalization};
use crate::models::product::{Product, ProductPage, StockReceipt};
use crate::repository::product_repository::ProductRepository;
use rusqlite::{params, Connection};

pub struct SqliteProductRepository {
    db_path: String,
}

impl SqliteProductRepository {
    pub fn new_safe(db_path: &str) -> Result<Self, String> {
        let repository = Self {
            db_path: db_path.into(),
        };
        repository.connection()?;
        Ok(repository)
    }

    fn connection(&self) -> Result<Connection, String> {
        let connection = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        register_search_normalization(&connection).map_err(|e| e.to_string())?;
        connection
            .execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")
            .map_err(|e| e.to_string())?;
        Ok(connection)
    }

    fn insert_batch(
        tx: &rusqlite::Transaction<'_>,
        product_id: i64,
        receipt: &StockReceipt,
    ) -> Result<(), String> {
        tx.execute(
            "INSERT INTO stock_batches(product_id,received_quantity,remaining_quantity,unit_cost_cents,received_at)
             VALUES(?1,?2,?2,?3,COALESCE(?4,datetime('now','localtime')))",
            params![product_id, receipt.quantity, receipt.unit_cost_cents, receipt.received_at],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}

impl ProductRepository for SqliteProductRepository {
    fn save(
        &self,
        product: Product,
        initial_stock: Option<StockReceipt>,
    ) -> Result<Product, String> {
        let mut connection = self.connection()?;
        let tx = connection.transaction().map_err(|e| e.to_string())?;
        let id = if let Some(id) = product.id {
            if initial_stock.is_some() {
                return Err("El stock inicial sólo puede registrarse al crear el producto".into());
            }
            let current_price: i64 = tx
                .query_row(
                    "SELECT sale_price_cents FROM products WHERE id=?1",
                    [id],
                    |row| row.get(0),
                )
                .map_err(|_| "El producto no existe".to_string())?;
            tx.execute(
                "UPDATE products SET name=?1,category=?2,sale_price_cents=?3,is_active=?4,updated_at=datetime('now','localtime') WHERE id=?5",
                params![product.name, product.category, product.sale_price_cents, product.is_active, id],
            ).map_err(|e| e.to_string())?;
            if current_price != product.sale_price_cents {
                tx.execute(
                    "INSERT INTO product_price_history(product_id,price_cents) VALUES(?1,?2)",
                    params![id, product.sale_price_cents],
                )
                .map_err(|e| e.to_string())?;
            }
            id
        } else {
            tx.execute(
                "INSERT INTO products(name,category,sale_price_cents,is_active) VALUES(?1,?2,?3,?4)",
                params![product.name, product.category, product.sale_price_cents, product.is_active],
            ).map_err(|e| e.to_string())?;
            let id = tx.last_insert_rowid();
            tx.execute(
                "INSERT INTO product_price_history(product_id,price_cents) VALUES(?1,?2)",
                params![id, product.sale_price_cents],
            )
            .map_err(|e| e.to_string())?;
            if let Some(receipt) = &initial_stock {
                Self::insert_batch(&tx, id, receipt)?;
            }
            id
        };
        tx.commit().map_err(|e| e.to_string())?;
        Ok(Product {
            id: Some(id),
            ..product
        })
    }

    fn page(&self, query: &str, page: i64, page_size: i64) -> Result<ProductPage, String> {
        let connection = self.connection()?;
        let normalized_query = normalize_search_text(query);
        let pattern = format!("%{normalized_query}%");
        let total: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM products WHERE ?1='' OR search_normalize(name) LIKE ?2",
                params![normalized_query, pattern],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let total_pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        let effective_page = if total_pages == 0 {
            1
        } else {
            page.min(total_pages)
        };
        let mut statement = connection.prepare(
            "SELECT p.id,p.name,p.category,p.sale_price_cents,p.is_active,COALESCE(SUM(b.remaining_quantity),0)
             FROM products p LEFT JOIN stock_batches b ON b.product_id=p.id
             WHERE ?1='' OR search_normalize(p.name) LIKE ?2
             GROUP BY p.id ORDER BY p.name COLLATE NOCASE,p.id LIMIT ?3 OFFSET ?4"
        ).map_err(|e| e.to_string())?;
        let products = statement
            .query_map(
                params![
                    normalized_query,
                    pattern,
                    page_size,
                    (effective_page - 1) * page_size
                ],
                |row| {
                    Ok(Product {
                        id: Some(row.get(0)?),
                        name: row.get(1)?,
                        category: row.get(2)?,
                        sale_price_cents: row.get(3)?,
                        is_active: row.get::<_, i64>(4)? != 0,
                        available_stock: row.get(5)?,
                    })
                },
            )
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(ProductPage {
            products,
            total,
            page: effective_page,
            page_size,
            total_pages,
        })
    }

    fn list_active(&self) -> Result<Vec<Product>, String> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(
            "SELECT p.id,p.name,p.category,p.sale_price_cents,p.is_active,COALESCE(SUM(b.remaining_quantity),0)
             FROM products p LEFT JOIN stock_batches b ON b.product_id=p.id
             WHERE p.is_active=1 GROUP BY p.id ORDER BY p.name COLLATE NOCASE,p.id"
        ).map_err(|e| e.to_string())?;
        let products = statement
            .query_map([], |row| {
                Ok(Product {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    category: row.get(2)?,
                    sale_price_cents: row.get(3)?,
                    is_active: row.get::<_, i64>(4)? != 0,
                    available_stock: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(products)
    }

    fn receive_stock(&self, product_id: i64, receipt: StockReceipt) -> Result<(), String> {
        let mut connection = self.connection()?;
        let tx = connection.transaction().map_err(|e| e.to_string())?;
        let exists: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM products WHERE id=?1",
                [product_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        if exists == 0 {
            return Err("El producto no existe".into());
        }
        Self::insert_batch(&tx, product_id, &receipt)?;
        tx.commit().map_err(|e| e.to_string())
    }
}
