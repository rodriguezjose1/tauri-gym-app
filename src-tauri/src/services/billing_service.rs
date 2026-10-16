use crate::models::billing::{
    DevGeneratedObligation, DevGenerationResult, Obligation, Payment, PaymentPage, PaymentQuote,
    PaymentRequest, PaymentStatusCounts, PersonPaymentHistoryItem, PersonPaymentHistoryPage,
    PersonPaymentPage, PersonPaymentStatus, PersonWithPaymentStatus, Plan, PlanPage,
};
use crate::models::person::Person;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Transaction};

pub struct BillingService {
    db_path: String,
}

impl BillingService {
    pub fn new(db_path: &str) -> Self {
        Self {
            db_path: db_path.into(),
        }
    }

    fn connection(&self) -> Result<Connection, String> {
        let connection = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        connection
            .execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")
            .map_err(|e| e.to_string())?;
        Ok(connection)
    }

    fn valid_period(period: &str) -> bool {
        let mut parts = period.split('-');
        matches!((parts.next(), parts.next(), parts.next()), (Some(y), Some(m), None)
            if y.len() == 4 && y.chars().all(|c| c.is_ascii_digit())
            && m.parse::<u8>().is_ok_and(|v| (1..=12).contains(&v)))
    }

    fn next_period(period: &str) -> Result<String, String> {
        if !Self::valid_period(period) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        let year: i32 = period[0..4].parse().map_err(|_| "Período inválido")?;
        let month: i32 = period[5..7].parse().map_err(|_| "Período inválido")?;
        Ok(if month == 12 {
            format!("{:04}-01", year + 1)
        } else {
            format!("{year:04}-{:02}", month + 1)
        })
    }

    pub fn list_plans(&self, active_only: bool) -> Result<Vec<Plan>, String> {
        let connection = self.connection()?;
        let mut statement = connection.prepare("SELECT id,name,modality,price_cents,is_active FROM plans WHERE (?1=0 OR is_active=1) ORDER BY name").map_err(|e| e.to_string())?;
        let result = statement
            .query_map([active_only as i32], |row| {
                Ok(Plan {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    modality: row.get(2)?,
                    price_cents: row.get(3)?,
                    is_active: row.get::<_, i64>(4)? != 0,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        result
    }

    pub fn plans_page(&self, page: i64, page_size: i64) -> Result<PlanPage, String> {
        if page < 1 || !(1..=100).contains(&page_size) {
            return Err("Parámetros de paginación inválidos".into());
        }
        let connection = self.connection()?;
        let total: i64 = connection
            .query_row("SELECT COUNT(*) FROM plans", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let total_pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        let effective_page = if total_pages > 0 {
            page.min(total_pages)
        } else {
            1
        };
        let mut statement = connection
            .prepare("SELECT id,name,modality,price_cents,is_active FROM plans ORDER BY name LIMIT ?1 OFFSET ?2")
            .map_err(|e| e.to_string())?;
        let plans = statement
            .query_map(
                params![page_size, (effective_page - 1) * page_size],
                |row| {
                    Ok(Plan {
                        id: Some(row.get(0)?),
                        name: row.get(1)?,
                        modality: row.get(2)?,
                        price_cents: row.get(3)?,
                        is_active: row.get::<_, i64>(4)? != 0,
                    })
                },
            )
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(PlanPage {
            plans,
            total,
            page: effective_page,
            page_size,
            total_pages,
        })
    }

    pub fn save_plan(&self, plan: Plan, effective_period: Option<&str>) -> Result<Plan, String> {
        let name = plan.name.trim();
        if name.is_empty() {
            return Err("El nombre del plan es obligatorio".into());
        }
        if !matches!(plan.modality.as_str(), "monthly" | "particular") {
            return Err("Modalidad inválida".into());
        }
        if plan.price_cents <= 0 {
            return Err("El precio debe ser positivo".into());
        }
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        let id = if let Some(id) = plan.id {
            let current_price: i64 = transaction
                .query_row(
                    "SELECT price_cents FROM plans WHERE id=?1 AND modality=?2",
                    params![id, plan.modality],
                    |row| row.get(0),
                )
                .map_err(|_| "El plan no existe o su modalidad no puede modificarse".to_string())?;
            let price_changed = current_price != plan.price_cents;
            let effective = if price_changed && plan.modality == "monthly" {
                let current: String = transaction
                    .query_row("SELECT strftime('%Y-%m','now','localtime')", [], |row| {
                        row.get(0)
                    })
                    .map_err(|e| e.to_string())?;
                let next = Self::next_period(&current)?;
                let selected =
                    effective_period.ok_or("Seleccioná desde cuándo aplicar el nuevo precio")?;
                if selected != current && selected != next {
                    return Err("La vigencia debe ser el mes actual o el próximo mes".into());
                }
                Some(selected.to_string())
            } else {
                None
            };
            let changed = transaction.execute("UPDATE plans SET name=?1,price_cents=?2,is_active=?3,updated_at=datetime('now','localtime') WHERE id=?4 AND modality=?5", params![name, plan.price_cents, plan.is_active, id, plan.modality]).map_err(|e| e.to_string())?;
            if changed == 0 {
                return Err("El plan no existe o su modalidad no puede modificarse".into());
            }
            if price_changed {
                transaction.execute(
                    "INSERT INTO plan_price_history(plan_id,price_cents,effective_period) VALUES(?1,?2,?3)",
                    params![id, plan.price_cents, effective],
                ).map_err(|e| e.to_string())?;
                if let Some(period) = effective {
                    transaction.execute(
                        "UPDATE obligations SET amount_cents=(
                            SELECT history.price_cents FROM plan_price_history history
                            WHERE history.plan_id=obligations.plan_id
                              AND history.effective_period IS NOT NULL
                              AND history.effective_period<=obligations.period
                            ORDER BY history.effective_period DESC,history.id DESC LIMIT 1
                         )
                         WHERE plan_id=?1 AND period>=?2 AND excluded_at IS NULL
                           AND NOT EXISTS(SELECT 1 FROM payments WHERE obligation_id=obligations.id)",
                        params![id, period],
                    ).map_err(|e| e.to_string())?;
                }
            }
            id
        } else {
            transaction
                .execute(
                    "INSERT INTO plans(name,modality,price_cents,is_active) VALUES(?1,?2,?3,?4)",
                    params![name, plan.modality, plan.price_cents, plan.is_active],
                )
                .map_err(|e| e.to_string())?;
            let id = transaction.last_insert_rowid();
            transaction.execute(
                "INSERT INTO plan_price_history(plan_id,price_cents,effective_period) VALUES(?1,?2,?3)",
                params![id, plan.price_cents, if plan.modality == "monthly" { Some("0000-01") } else { None }],
            ).map_err(|e| e.to_string())?;
            id
        };
        transaction.commit().map_err(|e| e.to_string())?;
        Ok(Plan {
            id: Some(id),
            name: name.into(),
            ..plan
        })
    }

    fn price_for_period(tx: &Transaction<'_>, plan_id: i64, period: &str) -> Result<i64, String> {
        tx.query_row(
            "SELECT price_cents FROM plan_price_history
             WHERE plan_id=?1 AND effective_period IS NOT NULL AND effective_period<=?2
             ORDER BY effective_period DESC,id DESC LIMIT 1",
            params![plan_id, period],
            |row| row.get(0),
        )
        .map_err(|_| "No existe un precio vigente para el plan y período".to_string())
    }

    fn applicable_plan(tx: &Transaction<'_>, person_id: i64, period: &str) -> Result<i64, String> {
        tx.query_row("SELECT plan_id FROM payments WHERE person_id=?1 AND modality='monthly' AND reversed_at IS NULL AND period < ?2 ORDER BY period DESC,id DESC LIMIT 1", params![person_id, period], |row| row.get(0)).optional().map_err(|e| e.to_string())?.ok_or_else(|| "El alumno todavía no tiene pagos mensuales anteriores".into())
    }

    fn ensure_obligation_tx(
        tx: &Transaction<'_>,
        person_id: i64,
        period: &str,
        fallback_plan_id: Option<i64>,
    ) -> Result<Obligation, String> {
        if !Self::valid_period(period) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        if let Some(item) = tx.query_row("SELECT o.id,o.person_id,o.period,o.plan_id,o.amount_cents,EXISTS(SELECT 1 FROM payments p WHERE p.obligation_id=o.id AND p.reversed_at IS NULL),o.excluded_at FROM obligations o WHERE person_id=?1 AND period=?2", params![person_id, period], obligation_row).optional().map_err(|e| e.to_string())? { return Ok(item); }
        let plan_id = Self::applicable_plan(tx, person_id, period)
            .or_else(|error| fallback_plan_id.ok_or(error))?;
        let active: bool = tx
            .query_row(
                "SELECT is_active FROM plans WHERE id=?1",
                [plan_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|_| "El plan aplicable no existe".to_string())?
            != 0;
        if !active {
            return Err("El plan aplicable está desactivado; seleccioná otro plan".into());
        }
        let amount = Self::price_for_period(tx, plan_id, period)?;
        tx.execute(
            "INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(?1,?2,?3,?4)",
            params![person_id, period, plan_id, amount],
        )
        .map_err(|e| e.to_string())?;
        Ok(Obligation {
            id: tx.last_insert_rowid(),
            person_id,
            period: period.into(),
            plan_id,
            amount_cents: amount,
            paid: false,
            excluded_at: None,
        })
    }

    pub fn ensure_obligation(&self, person_id: i64, period: &str) -> Result<Obligation, String> {
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        let item = Self::ensure_obligation_tx(&transaction, person_id, period, None)?;
        transaction.commit().map_err(|e| e.to_string())?;
        Ok(item)
    }

    pub fn reconcile_periods(&self) -> Result<usize, String> {
        let connection = self.connection()?;
        let current: String = connection
            .query_row("SELECT strftime('%Y-%m','now','localtime')", [], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())?;
        drop(connection);
        self.reconcile_through(&current)
    }

    pub fn monthly_due_date(&self, period: &str) -> Result<String, String> {
        if !Self::valid_period(period) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        let connection = self.connection()?;
        connection.query_row(
            "SELECT date(?1||'-10',CASE strftime('%w',?1||'-10') WHEN '6' THEN '+2 days' WHEN '0' THEN '+1 day' ELSE '+0 days' END)",
            [period],
            |row| row.get(0),
        ).map_err(|e| e.to_string())
    }

    pub fn reconcile_through(&self, through: &str) -> Result<usize, String> {
        if !Self::valid_period(through) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        let created = Self::reconcile_through_tx(&transaction, through)?;
        transaction.commit().map_err(|e| e.to_string())?;
        Ok(created.len())
    }

    fn reconcile_through_tx(
        transaction: &Transaction<'_>,
        through: &str,
    ) -> Result<Vec<i64>, String> {
        let ranges: Vec<(i64, String, Option<String>, String)> = {
            let mut statement = transaction.prepare(
                "SELECT a.person_id,a.active_from,a.inactive_from,MIN(p.period)
                 FROM person_activity_periods a JOIN payments p ON p.person_id=a.person_id
                   AND p.modality='monthly' AND p.reversed_at IS NULL AND p.period IS NOT NULL
                 WHERE a.active_from<=?1 AND (a.inactive_from IS NULL OR a.inactive_from>=a.active_from)
                 GROUP BY a.id ORDER BY a.person_id,a.active_from"
            ).map_err(|e| e.to_string())?;
            let result = statement
                .query_map([through], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            result
        };
        let mut created_ids = Vec::new();
        for (person_id, active_from, inactive_from, first_payment) in ranges {
            let first_missing = Self::next_period(&first_payment)?;
            let mut period = active_from.max(first_missing);
            let end = inactive_from
                .unwrap_or_else(|| through.to_string())
                .min(through.to_string());
            while period <= end {
                let plan_id = transaction.query_row("SELECT plan_id FROM payments WHERE person_id=?1 AND modality='monthly' AND reversed_at IS NULL AND period<?2 ORDER BY period DESC,id DESC LIMIT 1", params![person_id, period], |row| row.get::<_, i64>(0)).optional().map_err(|e| e.to_string())?;
                if let Some(plan_id) = plan_id {
                    let price = Self::price_for_period(&transaction, plan_id, &period)?;
                    let inserted = transaction.execute(
                        "INSERT OR IGNORE INTO obligations(person_id,period,plan_id,amount_cents)
                         SELECT ?1,?2,p.id,?4 FROM plans p WHERE p.id=?3 AND p.is_active=1",
                        params![person_id, period, plan_id, price],
                    ).map_err(|e| e.to_string())?;
                    if inserted == 1 {
                        created_ids.push(transaction.last_insert_rowid());
                    }
                }
                period = Self::next_period(&period)?;
            }
        }
        Ok(created_ids)
    }

    fn dev_generation_result(
        transaction: &Transaction<'_>,
        ids: &[i64],
    ) -> Result<DevGenerationResult, String> {
        let mut items = Vec::with_capacity(ids.len());
        for id in ids {
            let item = transaction
                .query_row(
                    "SELECT o.id,o.person_id,trim(pe.name||' '||pe.last_name),o.period,o.plan_id,pl.name,o.amount_cents
                     FROM obligations o JOIN people pe ON pe.id=o.person_id JOIN plans pl ON pl.id=o.plan_id
                     WHERE o.id=?1",
                    [id],
                    |row| {
                        Ok(DevGeneratedObligation {
                            id: row.get(0)?,
                            person_id: row.get(1)?,
                            person_name: row.get(2)?,
                            period: row.get(3)?,
                            plan_id: row.get(4)?,
                            plan_name: row.get(5)?,
                            amount_cents: row.get(6)?,
                        })
                    },
                )
                .map_err(|error| error.to_string())?;
            items.push(item);
        }
        let total_amount_cents = items.iter().map(|item| item.amount_cents).sum();
        Ok(DevGenerationResult {
            items,
            total_amount_cents,
        })
    }

    pub fn dev_preview_reconciliation(&self, through: &str) -> Result<DevGenerationResult, String> {
        if !cfg!(debug_assertions) {
            return Err("La simulación solo está disponible en desarrollo".into());
        }
        if !Self::valid_period(through) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        let ids = Self::reconcile_through_tx(&transaction, through)?;
        let result = Self::dev_generation_result(&transaction, &ids)?;
        transaction.rollback().map_err(|error| error.to_string())?;
        Ok(result)
    }

    pub fn dev_apply_reconciliation(&self, through: &str) -> Result<DevGenerationResult, String> {
        if !cfg!(debug_assertions) {
            return Err("La simulación solo está disponible en desarrollo".into());
        }
        if !Self::valid_period(through) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        let ids = Self::reconcile_through_tx(&transaction, through)?;
        let result = Self::dev_generation_result(&transaction, &ids)?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(result)
    }

    pub fn dev_rollback_reconciliation(
        &self,
        generated_items: &[DevGeneratedObligation],
    ) -> Result<usize, String> {
        if !cfg!(debug_assertions) {
            return Err("La simulación solo está disponible en desarrollo".into());
        }
        if generated_items.is_empty() {
            return Ok(0);
        }
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        for item in generated_items {
            let matches_original: bool = transaction
                .query_row(
                    "SELECT EXISTS(
                        SELECT 1 FROM obligations
                        WHERE id=?1 AND person_id=?2 AND period=?3 AND plan_id=?4 AND amount_cents=?5
                    )",
                    params![item.id, item.person_id, item.period, item.plan_id, item.amount_cents],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())?;
            if !matches_original {
                return Err(format!(
                    "No se puede revertir: la obligación {} cambió o ya no existe",
                    item.id
                ));
            }
            let used: bool = transaction
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM payments WHERE obligation_id=?1)",
                    [item.id],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())?;
            if used {
                return Err(format!(
                    "No se puede revertir: la obligación {} ya tiene pagos asociados",
                    item.id
                ));
            }
        }
        let mut deleted = 0;
        for item in generated_items {
            deleted += transaction
                .execute("DELETE FROM obligations WHERE id=?1", [item.id])
                .map_err(|error| error.to_string())?;
        }
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(deleted)
    }

    pub fn record_payment(&self, request: PaymentRequest) -> Result<Payment, String> {
        if request.amount_cents <= 0 {
            return Err("El importe debe ser positivo".into());
        }
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        let (plan_name, plan_modality): (String, String) = transaction
            .query_row(
                "SELECT name,modality FROM plans WHERE id=?1 AND is_active=1",
                [request.plan_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|_| "Plan inexistente".to_string())?;
        if plan_modality != request.modality {
            return Err("La modalidad no coincide con el plan".into());
        }
        let (obligation_id, period) = if request.modality == "monthly" {
            let period = request
                .period
                .as_deref()
                .ok_or("El período es obligatorio")?;
            let obligation = Self::ensure_obligation_tx(
                &transaction,
                request.person_id,
                period,
                Some(request.plan_id),
            )?;
            if obligation.paid {
                return Err("El período ya está pagado".into());
            }
            if obligation.excluded_at.is_some() {
                return Err("Restaurá el período antes de registrar el pago".into());
            }
            transaction
                .execute(
                    "UPDATE obligations SET plan_id=?1,amount_cents=?2 WHERE id=?3",
                    params![request.plan_id, request.amount_cents, obligation.id],
                )
                .map_err(|e| e.to_string())?;
            (Some(obligation.id), Some(period.to_string()))
        } else if request.modality == "particular" {
            (None, None)
        } else {
            return Err("Modalidad inválida".into());
        };
        transaction.execute("INSERT INTO payments(person_id,obligation_id,plan_id,plan_name,modality,period,amount_cents,paid_at) VALUES(?1,?2,?3,?4,?5,?6,?7,datetime('now','localtime'))", params![request.person_id, obligation_id, request.plan_id, plan_name, request.modality, period, request.amount_cents]).map_err(|e| e.to_string())?;
        let id = transaction.last_insert_rowid();
        let payment = transaction
            .query_row(PAYMENT_SELECT_BY_ID, [id], payment_row)
            .map_err(|e| e.to_string())?;
        transaction.commit().map_err(|e| e.to_string())?;
        Ok(payment)
    }

    pub fn reverse_payment(&self, id: i64, reason: &str) -> Result<(), String> {
        if reason.trim().is_empty() {
            return Err("El motivo es obligatorio".into());
        }
        let connection = self.connection()?;
        let changed = connection.execute("UPDATE payments SET reversed_at=datetime('now','localtime'),reversal_reason=?1 WHERE id=?2 AND reversed_at IS NULL", params![reason.trim(), id]).map_err(|e| e.to_string())?;
        if changed == 0 {
            Err("Pago inexistente o ya revertido".into())
        } else {
            Ok(())
        }
    }

    pub fn set_period_excluded(&self, obligation_id: i64, excluded: bool) -> Result<(), String> {
        let connection = self.connection()?;
        let sql = if excluded {
            "UPDATE obligations SET excluded_at=datetime('now','localtime') WHERE id=?1 AND excluded_at IS NULL AND NOT EXISTS(SELECT 1 FROM payments WHERE obligation_id=?1 AND reversed_at IS NULL)"
        } else {
            "UPDATE obligations SET excluded_at=NULL WHERE id=?1 AND excluded_at IS NOT NULL"
        };
        let changed = connection
            .execute(sql, [obligation_id])
            .map_err(|e| e.to_string())?;
        if changed == 0 {
            Err("El período no admite esa acción o ya fue actualizado".into())
        } else {
            Ok(())
        }
    }

    pub fn payment_statuses(&self, person_ids: &[i64]) -> Result<Vec<PersonPaymentStatus>, String> {
        if person_ids.is_empty() {
            return Ok(Vec::new());
        }
        let connection = self.connection()?;
        let placeholders = (1..=person_ids.len())
            .map(|index| format!("?{index}"))
            .collect::<Vec<_>>()
            .join(",");
        let sql = format!("SELECT pe.id,{PERSON_PAYMENT_STATUS_SQL} FROM people pe WHERE pe.id IN ({placeholders})");
        let mut statement = connection.prepare(&sql).map_err(|e| e.to_string())?;
        let result = statement
            .query_map(params_from_iter(person_ids.iter()), |row| {
                Ok(PersonPaymentStatus {
                    person_id: row.get(0)?,
                    status: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        result
    }

    pub fn persons_payment_page(
        &self,
        query: &str,
        payment_status: &str,
        page: i64,
        page_size: i64,
    ) -> Result<PersonPaymentPage, String> {
        if page < 1
            || !(1..=100).contains(&page_size)
            || !valid_payment_status_filter(payment_status)
        {
            return Err("Parámetros de consulta de personas inválidos".into());
        }
        let connection = self.connection()?;
        let normalized_query = query.trim().to_lowercase();
        let escaped_query = normalized_query
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let search_pattern = format!("%{escaped_query}%");
        let classified = format!("SELECT pe.id,pe.name,pe.last_name,pe.phone,{PERSON_PAYMENT_STATUS_SQL} AS payment_status FROM people pe WHERE (pe.deleted_at IS NULL OR pe.deleted_at='') AND (pe.is_active=1 OR pe.is_active IS NULL)");
        let total_sql = format!("WITH classified AS ({classified}) SELECT COUNT(*) FROM classified WHERE (?1='all' OR payment_status=?1) AND (?2='' OR lower(name) LIKE ?3 ESCAPE '\\' OR lower(last_name) LIKE ?3 ESCAPE '\\' OR lower(name||' '||last_name) LIKE ?3 ESCAPE '\\')");
        let total: i64 = connection
            .query_row(
                &total_sql,
                params![payment_status, normalized_query, search_pattern],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let total_pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        let effective_page = if total_pages > 0 {
            page.min(total_pages)
        } else {
            1
        };
        let page_sql = format!("WITH classified AS ({classified}) SELECT id,name,last_name,phone,payment_status FROM classified WHERE (?1='all' OR payment_status=?1) AND (?2='' OR lower(name) LIKE ?3 ESCAPE '\\' OR lower(last_name) LIKE ?3 ESCAPE '\\' OR lower(name||' '||last_name) LIKE ?3 ESCAPE '\\') ORDER BY name,last_name LIMIT ?4 OFFSET ?5");
        let mut statement = connection.prepare(&page_sql).map_err(|e| e.to_string())?;
        let persons = statement
            .query_map(
                params![
                    payment_status,
                    normalized_query,
                    search_pattern,
                    page_size,
                    (effective_page - 1) * page_size
                ],
                |row| {
                    Ok(PersonWithPaymentStatus {
                        person: Person {
                            id: Some(row.get(0)?),
                            name: row.get(1)?,
                            last_name: row.get(2)?,
                            phone: row.get(3)?,
                        },
                        payment_status: row.get(4)?,
                    })
                },
            )
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(PersonPaymentPage {
            persons,
            total,
            page: effective_page,
            page_size,
            total_pages,
        })
    }

    pub fn payment_status_counts(&self) -> Result<PaymentStatusCounts, String> {
        let connection = self.connection()?;
        let sql = format!("WITH classified AS (SELECT {PERSON_PAYMENT_STATUS_SQL} AS payment_status FROM people pe WHERE (pe.deleted_at IS NULL OR pe.deleted_at='') AND (pe.is_active=1 OR pe.is_active IS NULL)) SELECT COUNT(*),COALESCE(SUM(payment_status='overdue'),0),COALESCE(SUM(payment_status='pending'),0),COALESCE(SUM(payment_status='current'),0),COALESCE(SUM(payment_status='no_plan'),0) FROM classified");
        connection
            .query_row(&sql, [], |row| {
                Ok(PaymentStatusCounts {
                    all: row.get(0)?,
                    overdue: row.get(1)?,
                    pending: row.get(2)?,
                    current: row.get(3)?,
                    no_plan: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())
    }

    pub fn person_history(
        &self,
        person_id: i64,
        page: i64,
        page_size: i64,
    ) -> Result<PersonPaymentHistoryPage, String> {
        if page < 1 || !(1..=100).contains(&page_size) {
            return Err("Parámetros de paginación inválidos".into());
        }
        let connection = self.connection()?;
        let total: i64 = connection.query_row("SELECT (SELECT COUNT(*) FROM obligations WHERE person_id=?1)+(SELECT COUNT(*) FROM payments WHERE person_id=?1 AND modality='particular')", [person_id], |row| row.get(0)).map_err(|e| e.to_string())?;
        let total_pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        let effective_page = if total_pages > 0 {
            page.min(total_pages)
        } else {
            1
        };
        let mut statement = connection
            .prepare(HISTORY_QUERY)
            .map_err(|e| e.to_string())?;
        let items = statement
            .query_map(
                params![person_id, page_size, (effective_page - 1) * page_size],
                history_row,
            )
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(PersonPaymentHistoryPage {
            items,
            total,
            page: effective_page,
            page_size,
            total_pages,
        })
    }

    pub fn quote_payment(
        &self,
        person_id: i64,
        period: &str,
        requested_plan_id: Option<i64>,
    ) -> Result<PaymentQuote, String> {
        if !Self::valid_period(period) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        let connection = self.connection()?;
        let existing: Option<(i64, i64, i64)> = connection.query_row("SELECT plan_id,amount_cents,EXISTS(SELECT 1 FROM payments WHERE obligation_id=o.id AND reversed_at IS NULL) FROM obligations o WHERE person_id=?1 AND period=?2", params![person_id, period], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))).optional().map_err(|e| e.to_string())?;
        if let Some((persisted_plan_id, amount_cents, paid)) = existing {
            let requested_plan =
                if let Some(requested) = requested_plan_id {
                    connection.query_row(
                    "SELECT id FROM plans WHERE id=?1 AND modality='monthly' AND is_active=1",
                    [requested],
                    |row| row.get(0),
                ).optional().map_err(|e| e.to_string())?
                } else {
                    None
                };
            let plan_id = requested_plan.unwrap_or(persisted_plan_id);
            let suggested_amount = if plan_id == persisted_plan_id {
                amount_cents
            } else {
                connection
                    .query_row(
                        "SELECT price_cents FROM plan_price_history
                     WHERE plan_id=?1 AND effective_period IS NOT NULL AND effective_period<=?2
                     ORDER BY effective_period DESC,id DESC LIMIT 1",
                        params![plan_id, period],
                        |row| row.get(0),
                    )
                    .map_err(|_| "No existe un precio vigente para el plan y período".to_string())?
            };
            return Ok(PaymentQuote {
                plan_id: Some(plan_id),
                amount_cents: Some(suggested_amount),
                already_paid: paid != 0,
            });
        }
        let plan_id = if let Some(plan_id) = requested_plan_id {
            connection
                .query_row(
                    "SELECT id FROM plans WHERE id=?1 AND modality='monthly' AND is_active=1",
                    [plan_id],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|e| e.to_string())?
        } else {
            connection.query_row("SELECT plan_id FROM payments WHERE person_id=?1 AND modality='monthly' AND reversed_at IS NULL AND period<?2 ORDER BY period DESC,id DESC LIMIT 1", params![person_id, period], |row| row.get(0)).optional().map_err(|e| e.to_string())?
        };
        let amount_cents = if let Some(id) = plan_id {
            connection
                .query_row(
                    "SELECT history.price_cents
                     FROM plan_price_history history JOIN plans plan ON plan.id=history.plan_id
                     WHERE history.plan_id=?1 AND plan.is_active=1
                       AND history.effective_period IS NOT NULL AND history.effective_period<=?2
                     ORDER BY history.effective_period DESC,history.id DESC LIMIT 1",
                    params![id, period],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|e| e.to_string())?
        } else {
            None
        };
        Ok(PaymentQuote {
            plan_id: if amount_cents.is_some() {
                plan_id
            } else {
                None
            },
            amount_cents,
            already_paid: false,
        })
    }

    pub fn list_payments(&self) -> Result<Vec<Payment>, String> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(PAYMENT_SELECT_ALL)
            .map_err(|e| e.to_string())?;
        let result = statement
            .query_map([], payment_row)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        result
    }

    pub fn payments_page(
        &self,
        month: &str,
        person_query: &str,
        page: i64,
        page_size: i64,
    ) -> Result<PaymentPage, String> {
        if !Self::valid_period(month) || page < 1 || !(1..=100).contains(&page_size) {
            return Err("Parámetros de paginación inválidos".into());
        }
        let connection = self.connection()?;
        // `paid_at` is the effective payment date available in the current schema.
        // It is persisted in local time, so its YYYY-MM prefix defines cash flow.
        let (collected, count, period_paid): (i64, i64, i64) = connection.query_row(
            "SELECT
                COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN amount_cents ELSE 0 END),0),
                COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN 1 ELSE 0 END),0),
                COALESCE((SELECT SUM(amount_cents) FROM payments WHERE modality='monthly' AND period=?1 AND reversed_at IS NULL),0)
             FROM payments WHERE substr(paid_at,1,7)=?1",
            [month],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        ).map_err(|e| e.to_string())?;
        let normalized_query = person_query.trim();
        let escaped_query = normalized_query
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let search_pattern = format!("%{escaped_query}%");
        let total: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM payments p JOIN people pe ON pe.id=p.person_id
             WHERE substr(p.paid_at,1,7)=?1
               AND (?2='' OR trim(pe.name||' '||pe.last_name) LIKE ?3 ESCAPE '\\' COLLATE NOCASE)",
                params![month, normalized_query, search_pattern],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let total_pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        let effective_page = if total_pages > 0 {
            page.min(total_pages)
        } else {
            1
        };
        let mut statement = connection.prepare("SELECT p.id,p.person_id,p.obligation_id,p.plan_id,p.plan_name,p.modality,p.period,p.amount_cents,p.paid_at,p.reversed_at,p.reversal_reason,pe.name||' '||pe.last_name FROM payments p JOIN people pe ON pe.id=p.person_id WHERE substr(p.paid_at,1,7)=?1 AND (?2='' OR trim(pe.name||' '||pe.last_name) LIKE ?3 ESCAPE '\\' COLLATE NOCASE) ORDER BY p.paid_at DESC,p.id DESC LIMIT ?4 OFFSET ?5").map_err(|e| e.to_string())?;
        let payments = statement
            .query_map(
                params![
                    month,
                    normalized_query,
                    search_pattern,
                    page_size,
                    (effective_page - 1) * page_size
                ],
                payment_row,
            )
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(PaymentPage {
            payments,
            total,
            page: effective_page,
            page_size,
            total_pages,
            collected_cents: collected,
            period_paid_cents: period_paid,
            payment_count: count,
        })
    }
}

const PERSON_PAYMENT_STATUS_SQL: &str = "CASE
    WHEN NOT EXISTS(SELECT 1 FROM payments p WHERE p.person_id=pe.id AND p.modality='monthly' AND p.reversed_at IS NULL) THEN 'no_plan'
    WHEN EXISTS(SELECT 1 FROM obligations o WHERE o.person_id=pe.id AND o.excluded_at IS NULL AND NOT EXISTS(SELECT 1 FROM payments p WHERE p.obligation_id=o.id AND p.reversed_at IS NULL) AND date('now','localtime') > date(o.period||'-10',CASE strftime('%w',o.period||'-10') WHEN '6' THEN '+2 days' WHEN '0' THEN '+1 day' ELSE '+0 days' END)) THEN 'overdue'
    WHEN EXISTS(SELECT 1 FROM obligations o WHERE o.person_id=pe.id AND o.excluded_at IS NULL AND NOT EXISTS(SELECT 1 FROM payments p WHERE p.obligation_id=o.id AND p.reversed_at IS NULL)) THEN 'pending'
    ELSE 'current' END";

fn valid_payment_status_filter(value: &str) -> bool {
    matches!(value, "all" | "overdue" | "pending" | "current" | "no_plan")
}

const PAYMENT_SELECT_BY_ID: &str = "SELECT p.id,p.person_id,p.obligation_id,p.plan_id,p.plan_name,p.modality,p.period,p.amount_cents,p.paid_at,p.reversed_at,p.reversal_reason,pe.name||' '||pe.last_name FROM payments p JOIN people pe ON pe.id=p.person_id WHERE p.id=?1";
const PAYMENT_SELECT_ALL: &str = "SELECT p.id,p.person_id,p.obligation_id,p.plan_id,p.plan_name,p.modality,p.period,p.amount_cents,p.paid_at,p.reversed_at,p.reversal_reason,pe.name||' '||pe.last_name FROM payments p JOIN people pe ON pe.id=p.person_id ORDER BY p.paid_at DESC,p.id DESC";
const HISTORY_QUERY: &str = "SELECT item_type,obligation_id,payment_id,period,plan_id,plan_name,amount_cents,status,paid_at FROM (
    SELECT 'monthly' item_type,o.id obligation_id,p.id payment_id,o.period,o.plan_id,pl.name plan_name,o.amount_cents,
      CASE WHEN o.excluded_at IS NOT NULL THEN 'excluded' WHEN p.id IS NOT NULL THEN 'paid'
           WHEN date('now','localtime') > date(o.period||'-10',CASE strftime('%w',o.period||'-10') WHEN '6' THEN '+2 days' WHEN '0' THEN '+1 day' ELSE '+0 days' END) THEN 'overdue' ELSE 'pending' END status,p.paid_at
    FROM obligations o JOIN plans pl ON pl.id=o.plan_id LEFT JOIN payments p ON p.obligation_id=o.id AND p.reversed_at IS NULL WHERE o.person_id=?1
    UNION ALL
    SELECT 'particular',NULL,p.id,NULL,p.plan_id,p.plan_name,p.amount_cents,CASE WHEN p.reversed_at IS NULL THEN 'paid' ELSE 'reversed' END,p.paid_at FROM payments p WHERE p.person_id=?1 AND p.modality='particular'
  ) ORDER BY COALESCE(period,substr(paid_at,1,7)) DESC,COALESCE(paid_at,'') DESC,payment_id DESC LIMIT ?2 OFFSET ?3";

fn obligation_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Obligation> {
    Ok(Obligation {
        id: row.get(0)?,
        person_id: row.get(1)?,
        period: row.get(2)?,
        plan_id: row.get(3)?,
        amount_cents: row.get(4)?,
        paid: row.get::<_, i64>(5)? != 0,
        excluded_at: row.get(6)?,
    })
}
fn payment_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Payment> {
    Ok(Payment {
        id: row.get(0)?,
        person_id: row.get(1)?,
        obligation_id: row.get(2)?,
        plan_id: row.get(3)?,
        plan_name: row.get(4)?,
        modality: row.get(5)?,
        period: row.get(6)?,
        amount_cents: row.get(7)?,
        paid_at: row.get(8)?,
        reversed_at: row.get(9)?,
        reversal_reason: row.get(10)?,
        person_name: row.get(11)?,
    })
}
fn history_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<PersonPaymentHistoryItem> {
    Ok(PersonPaymentHistoryItem {
        item_type: row.get(0)?,
        obligation_id: row.get(1)?,
        payment_id: row.get(2)?,
        period: row.get(3)?,
        plan_id: row.get(4)?,
        plan_name: row.get(5)?,
        amount_cents: row.get(6)?,
        status: row.get(7)?,
        paid_at: row.get(8)?,
    })
}
