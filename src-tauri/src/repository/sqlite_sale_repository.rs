use crate::models::sale::{SaleItemResult, SalePage, SaleRequest, SaleResult, SaleSummary};
use crate::repository::sale_repository::SaleRepository;
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};

pub struct SqliteSaleRepository {
    db_path: String,
}

struct Allocation {
    batch_id: i64,
    quantity: i64,
    unit_cost_cents: i64,
}
struct ResolvedItem {
    product_id: i64,
    product_name: String,
    quantity: i64,
    unit_price_cents: i64,
    line_total_cents: i64,
    cost_total_cents: i64,
    allocations: Vec<Allocation>,
}

impl SqliteSaleRepository {
    pub fn new_safe(db_path: &str) -> Result<Self, String> {
        let repository = Self {
            db_path: db_path.into(),
        };
        repository.connection()?;
        Ok(repository)
    }

    fn connection(&self) -> Result<Connection, String> {
        let connection = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        connection
            .execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")
            .map_err(|e| e.to_string())?;
        Ok(connection)
    }

    fn checked_total(left: i64, right: i64) -> Result<i64, String> {
        left.checked_mul(right)
            .ok_or_else(|| "El importe de la venta es demasiado grande".into())
    }

    fn summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<SaleSummary> {
        Ok(SaleSummary {
            id: row.get(0)?,
            buyer_name: row.get(1)?,
            products: row.get(2)?,
            payment_method: row.get(3)?,
            total_amount_cents: row.get(4)?,
            total_cost_cents: row.get(5)?,
            sold_at: row.get(6)?,
            voided_at: row.get(7)?,
            void_reason: row.get(8)?,
        })
    }
}

impl SaleRepository for SqliteSaleRepository {
    fn register(&self, request: SaleRequest) -> Result<SaleResult, String> {
        let mut connection = self.connection()?;
        let tx = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|e| e.to_string())?;

        let buyer_name = if let Some(person_id) = request.buyer_person_id {
            tx.query_row(
                "SELECT trim(name || ' ' || last_name) FROM people WHERE id=?1 AND (deleted_at IS NULL OR deleted_at='')",
                [person_id], |row| row.get::<_, String>(0),
            ).optional().map_err(|e| e.to_string())?.ok_or("El alumno seleccionado no existe")?.into()
        } else {
            None
        };

        let mut resolved_items = Vec::with_capacity(request.items.len());
        let mut sale_total = 0_i64;
        let mut sale_cost = 0_i64;
        for item in &request.items {
            let (product_name, unit_price_cents): (String, i64) = tx
                .query_row(
                    "SELECT name,sale_price_cents FROM products WHERE id=?1 AND is_active=1",
                    [item.product_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .optional()
                .map_err(|e| e.to_string())?
                .ok_or("El producto no existe o está inactivo")?;
            let mut statement = tx
                .prepare(
                    "SELECT id,remaining_quantity,unit_cost_cents FROM stock_batches
                 WHERE product_id=?1 AND remaining_quantity>0 ORDER BY received_at,id",
                )
                .map_err(|e| e.to_string())?;
            let batches = statement
                .query_map([item.product_id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            drop(statement);
            let mut pending = item.quantity;
            let mut allocations = Vec::new();
            let mut cost_total = 0_i64;
            for (batch_id, available, unit_cost_cents) in batches {
                if pending == 0 {
                    break;
                }
                let quantity = pending.min(available);
                cost_total = cost_total
                    .checked_add(Self::checked_total(quantity, unit_cost_cents)?)
                    .ok_or("El costo de la venta es demasiado grande")?;
                allocations.push(Allocation {
                    batch_id,
                    quantity,
                    unit_cost_cents,
                });
                pending -= quantity;
            }
            if pending > 0 {
                return Err(format!("Stock insuficiente para {product_name}"));
            }
            let line_total = Self::checked_total(item.quantity, unit_price_cents)?;
            sale_total = sale_total
                .checked_add(line_total)
                .ok_or("El total de la venta es demasiado grande")?;
            sale_cost = sale_cost
                .checked_add(cost_total)
                .ok_or("El costo de la venta es demasiado grande")?;
            resolved_items.push(ResolvedItem {
                product_id: item.product_id,
                product_name,
                quantity: item.quantity,
                unit_price_cents,
                line_total_cents: line_total,
                cost_total_cents: cost_total,
                allocations,
            });
        }

        tx.execute(
            "INSERT INTO sales(buyer_person_id,buyer_name,payment_method,total_amount_cents,total_cost_cents) VALUES(?1,?2,?3,?4,?5)",
            params![request.buyer_person_id, buyer_name, request.payment_method, sale_total, sale_cost],
        ).map_err(|e| e.to_string())?;
        let sale_id = tx.last_insert_rowid();
        let mut result_items = Vec::with_capacity(resolved_items.len());
        for item in resolved_items {
            tx.execute(
                "INSERT INTO sale_items(sale_id,product_id,product_name,quantity,unit_price_cents,line_total_cents) VALUES(?1,?2,?3,?4,?5,?6)",
                params![sale_id,item.product_id,item.product_name,item.quantity,item.unit_price_cents,item.line_total_cents],
            ).map_err(|e| e.to_string())?;
            let sale_item_id = tx.last_insert_rowid();
            for allocation in item.allocations {
                let changed = tx.execute(
                    "UPDATE stock_batches SET remaining_quantity=remaining_quantity-?1 WHERE id=?2 AND remaining_quantity>=?1",
                    params![allocation.quantity,allocation.batch_id],
                ).map_err(|e| e.to_string())?;
                if changed != 1 {
                    return Err("El stock cambió durante la venta; volvé a intentarlo".into());
                }
                tx.execute(
                    "INSERT INTO sale_item_allocations(sale_item_id,stock_batch_id,quantity,unit_cost_cents,cost_total_cents) VALUES(?1,?2,?3,?4,?5)",
                    params![sale_item_id,allocation.batch_id,allocation.quantity,allocation.unit_cost_cents,Self::checked_total(allocation.quantity,allocation.unit_cost_cents)?],
                ).map_err(|e| e.to_string())?;
            }
            result_items.push(SaleItemResult {
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price_cents: item.unit_price_cents,
                line_total_cents: item.line_total_cents,
                cost_total_cents: item.cost_total_cents,
            });
        }
        let sold_at: String = tx
            .query_row("SELECT sold_at FROM sales WHERE id=?1", [sale_id], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(SaleResult {
            id: sale_id,
            buyer_name,
            payment_method: request.payment_method,
            total_amount_cents: sale_total,
            total_cost_cents: sale_cost,
            sold_at,
            voided_at: None,
            void_reason: None,
            items: result_items,
        })
    }

    fn page(
        &self,
        month: &str,
        query: &str,
        status: &str,
        page: i64,
        page_size: i64,
    ) -> Result<SalePage, String> {
        let connection = self.connection()?;
        let pattern = format!(
            "%{}%",
            query
                .replace('\\', "\\\\")
                .replace('%', "\\%")
                .replace('_', "\\_")
        );
        let status_filter = match status {
            "active" => "AND s.voided_at IS NULL",
            "voided" => "AND s.voided_at IS NOT NULL",
            _ => "",
        };
        let where_sql = format!("WHERE substr(s.sold_at,1,7)=?1 AND (?2='' OR COALESCE(s.buyer_name,'') LIKE ?3 ESCAPE '\\' COLLATE NOCASE OR EXISTS(SELECT 1 FROM sale_items si WHERE si.sale_id=s.id AND si.product_name LIKE ?3 ESCAPE '\\' COLLATE NOCASE)) {status_filter}");
        let total = connection
            .query_row(
                &format!("SELECT COUNT(*) FROM sales s {where_sql}"),
                params![month, query, pattern],
                |row| row.get::<_, i64>(0),
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
        let mut statement = connection.prepare(&format!("SELECT s.id,s.buyer_name,COALESCE((SELECT group_concat(si.quantity || ' × ' || si.product_name, ', ') FROM sale_items si WHERE si.sale_id=s.id),''),s.payment_method,s.total_amount_cents,s.total_cost_cents,s.sold_at,s.voided_at,s.void_reason FROM sales s {where_sql} ORDER BY s.sold_at DESC,s.id DESC LIMIT ?4 OFFSET ?5")).map_err(|e| e.to_string())?;
        let sales = statement
            .query_map(
                params![
                    month,
                    query,
                    pattern,
                    page_size,
                    (effective_page - 1) * page_size
                ],
                Self::summary,
            )
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(SalePage {
            sales,
            total,
            page: effective_page,
            page_size,
            total_pages,
        })
    }

    fn get(&self, id: i64) -> Result<SaleResult, String> {
        let connection = self.connection()?;
        let sale = connection.query_row("SELECT s.id,s.buyer_name,COALESCE((SELECT group_concat(si.quantity || ' × ' || si.product_name, ', ') FROM sale_items si WHERE si.sale_id=s.id),''),s.payment_method,s.total_amount_cents,s.total_cost_cents,s.sold_at,s.voided_at,s.void_reason FROM sales s WHERE s.id=?1", [id], Self::summary).optional().map_err(|e| e.to_string())?.ok_or("La venta no existe")?;
        let mut statement = connection.prepare("SELECT si.product_id,si.product_name,si.quantity,si.unit_price_cents,si.line_total_cents,COALESCE(SUM(a.cost_total_cents),0) FROM sale_items si LEFT JOIN sale_item_allocations a ON a.sale_item_id=si.id WHERE si.sale_id=?1 GROUP BY si.id ORDER BY si.id").map_err(|e| e.to_string())?;
        let items = statement
            .query_map([id], |row| {
                Ok(SaleItemResult {
                    product_id: row.get(0)?,
                    product_name: row.get(1)?,
                    quantity: row.get(2)?,
                    unit_price_cents: row.get(3)?,
                    line_total_cents: row.get(4)?,
                    cost_total_cents: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(SaleResult {
            id: sale.id,
            buyer_name: sale.buyer_name,
            payment_method: sale.payment_method,
            total_amount_cents: sale.total_amount_cents,
            total_cost_cents: sale.total_cost_cents,
            sold_at: sale.sold_at,
            voided_at: sale.voided_at,
            void_reason: sale.void_reason,
            items,
        })
    }

    fn void_sale(&self, id: i64, reason: &str) -> Result<(), String> {
        let mut connection = self.connection()?;
        let tx = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|e| e.to_string())?;
        let voided: Option<String> = tx
            .query_row("SELECT voided_at FROM sales WHERE id=?1", [id], |row| {
                row.get(0)
            })
            .optional()
            .map_err(|e| e.to_string())?
            .ok_or("La venta no existe")?;
        if voided.is_some() {
            return Err("La venta ya fue anulada".into());
        }
        let mut statement = tx.prepare("SELECT a.stock_batch_id,a.quantity FROM sale_item_allocations a JOIN sale_items si ON si.id=a.sale_item_id WHERE si.sale_id=?1 ORDER BY a.id").map_err(|e| e.to_string())?;
        let allocations = statement
            .query_map([id], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        drop(statement);
        for (batch_id, quantity) in allocations {
            if tx
                .execute(
                    "UPDATE stock_batches SET remaining_quantity=remaining_quantity+?1 WHERE id=?2",
                    params![quantity, batch_id],
                )
                .map_err(|e| e.to_string())?
                != 1
            {
                return Err("No se pudo restaurar el lote original".into());
            }
        }
        if tx.execute("UPDATE sales SET voided_at=datetime('now','localtime'),void_reason=?1 WHERE id=?2 AND voided_at IS NULL", params![reason, id]).map_err(|e| e.to_string())? != 1 { return Err("La venta ya fue anulada".into()); }
        tx.commit().map_err(|e| e.to_string())
    }
}
