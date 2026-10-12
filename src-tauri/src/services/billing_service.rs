use crate::models::billing::{
    Obligation, Payment, PaymentPage, PaymentQuote, PaymentRequest, Plan,
};
use rusqlite::{params, Connection, OptionalExtension, Transaction};

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
        let c = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        c.execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")
            .map_err(|e| e.to_string())?;
        Ok(c)
    }
    fn valid_period(period: &str) -> bool {
        let mut p = period.split('-');
        matches!((p.next(), p.next(), p.next()), (Some(y), Some(m), None) if y.len()==4 && y.chars().all(|c| c.is_ascii_digit()) && m.parse::<u8>().is_ok_and(|v| (1..=12).contains(&v)))
    }
    pub fn list_plans(&self, active_only: bool) -> Result<Vec<Plan>, String> {
        let c = self.connection()?;
        let mut s=c.prepare("SELECT id,name,modality,price_cents,is_active FROM plans WHERE (?1=0 OR is_active=1) ORDER BY name").map_err(|e|e.to_string())?;
        let result = s
            .query_map([active_only as i32], |r| {
                Ok(Plan {
                    id: Some(r.get(0)?),
                    name: r.get(1)?,
                    modality: r.get(2)?,
                    price_cents: r.get(3)?,
                    is_active: r.get::<_, i64>(4)? != 0,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        result
    }
    pub fn save_plan(&self, plan: Plan) -> Result<Plan, String> {
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
        let c = self.connection()?;
        let id = if let Some(id) = plan.id {
            let changed=c.execute("UPDATE plans SET name=?1,price_cents=?2,is_active=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?4 AND modality=?5",params![name,plan.price_cents,plan.is_active,id,plan.modality]).map_err(|e|e.to_string())?;
            if changed == 0 {
                return Err("El plan no existe o su modalidad no puede modificarse".into());
            }
            id
        } else {
            c.execute(
                "INSERT INTO plans(name,modality,price_cents,is_active) VALUES(?1,?2,?3,?4)",
                params![name, plan.modality, plan.price_cents, plan.is_active],
            )
            .map_err(|e| e.to_string())?;
            c.last_insert_rowid()
        };
        Ok(Plan {
            id: Some(id),
            name: name.into(),
            ..plan
        })
    }
    fn applicable_plan(tx: &Transaction<'_>, person_id: i64, period: &str) -> Result<i64, String> {
        tx.query_row("SELECT plan_id FROM payments WHERE person_id=?1 AND modality='monthly' AND reversed_at IS NULL AND period < ?2 ORDER BY period DESC, id DESC LIMIT 1",params![person_id,period],|r|r.get(0)).optional().map_err(|e|e.to_string())?.ok_or_else(||"El alumno todavía no tiene pagos mensuales anteriores".into())
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
        if let Some(o)=tx.query_row("SELECT o.id,o.person_id,o.period,o.plan_id,o.amount_cents,EXISTS(SELECT 1 FROM payments p WHERE p.obligation_id=o.id AND p.reversed_at IS NULL) FROM obligations o WHERE person_id=?1 AND period=?2",params![person_id,period],|r|Ok(Obligation{id:r.get(0)?,person_id:r.get(1)?,period:r.get(2)?,plan_id:r.get(3)?,amount_cents:r.get(4)?,paid:r.get::<_,i64>(5)?!=0})).optional().map_err(|e|e.to_string())?{return Ok(o)}
        let plan_id = match Self::applicable_plan(tx, person_id, period) {
            Ok(id) => id,
            Err(e) => fallback_plan_id.ok_or(e)?,
        };
        let amount: i64 = tx
            .query_row(
                "SELECT price_cents FROM plans WHERE id=?1 AND is_active=1",
                [plan_id],
                |r| r.get(0),
            )
            .map_err(|_| {
                "El plan aplicable está desactivado; seleccioná otro plan al cobrar".to_string()
            })?;
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
        })
    }
    pub fn ensure_obligation(&self, person_id: i64, period: &str) -> Result<Obligation, String> {
        let mut c = self.connection()?;
        let tx = c.transaction().map_err(|e| e.to_string())?;
        let o = Self::ensure_obligation_tx(&tx, person_id, period, None)?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(o)
    }
    pub fn record_payment(&self, r: PaymentRequest) -> Result<Payment, String> {
        if r.amount_cents <= 0 {
            return Err("El importe debe ser positivo".into());
        }
        let mut c = self.connection()?;
        let tx = c.transaction().map_err(|e| e.to_string())?;
        let (name, modality): (String, String) = tx
            .query_row(
                "SELECT name,modality FROM plans WHERE id=?1 AND is_active=1",
                [r.plan_id],
                |x| Ok((x.get(0)?, x.get(1)?)),
            )
            .map_err(|_| "Plan inexistente".to_string())?;
        let (obligation_id, period) = if r.modality == "monthly" {
            let p = r.period.as_deref().ok_or("El período es obligatorio")?;
            let o = Self::ensure_obligation_tx(&tx, r.person_id, p, Some(r.plan_id))?;
            if o.paid {
                return Err("La obligación ya está pagada".into());
            }
            tx.execute(
                "UPDATE obligations SET plan_id=?1,amount_cents=?2 WHERE id=?3",
                params![r.plan_id, r.amount_cents, o.id],
            )
            .map_err(|e| e.to_string())?;
            (Some(o.id), Some(p.to_string()))
        } else if r.modality == "particular" {
            (None, None)
        } else {
            return Err("Modalidad inválida".into());
        };
        if modality != r.modality {
            return Err("La modalidad no coincide con el plan".into());
        }
        tx.execute("INSERT INTO payments(person_id,obligation_id,plan_id,plan_name,modality,period,amount_cents,paid_at) VALUES(?1,?2,?3,?4,?5,?6,?7,datetime('now','localtime'))",params![r.person_id,obligation_id,r.plan_id,name,r.modality,period,r.amount_cents]).map_err(|e|e.to_string())?;
        let id = tx.last_insert_rowid();
        let p=tx.query_row("SELECT p.id,p.person_id,p.obligation_id,p.plan_id,p.plan_name,p.modality,p.period,p.amount_cents,p.paid_at,p.reversed_at,p.reversal_reason,pe.name||' '||pe.last_name FROM payments p JOIN people pe ON pe.id=p.person_id WHERE p.id=?1",[id],payment_row).map_err(|e|e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(p)
    }
    pub fn reverse_payment(&self, id: i64, reason: &str) -> Result<(), String> {
        if reason.trim().is_empty() {
            return Err("El motivo es obligatorio".into());
        }
        let c = self.connection()?;
        let n=c.execute("UPDATE payments SET reversed_at=CURRENT_TIMESTAMP,reversal_reason=?1 WHERE id=?2 AND reversed_at IS NULL",params![reason.trim(),id]).map_err(|e|e.to_string())?;
        if n == 0 {
            Err("Pago inexistente o ya revertido".into())
        } else {
            Ok(())
        }
    }
    pub fn list_payments(&self) -> Result<Vec<Payment>, String> {
        let c = self.connection()?;
        let mut s=c.prepare("SELECT p.id,p.person_id,p.obligation_id,p.plan_id,p.plan_name,p.modality,p.period,p.amount_cents,p.paid_at,p.reversed_at,p.reversal_reason,pe.name||' '||pe.last_name FROM payments p JOIN people pe ON pe.id=p.person_id ORDER BY p.paid_at DESC,p.id DESC").map_err(|e|e.to_string())?;
        let result = s
            .query_map([], payment_row)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        result
    }
    pub fn quote_payment(&self, person_id: i64, period: &str) -> Result<PaymentQuote, String> {
        if !Self::valid_period(period) {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        let c = self.connection()?;
        let existing:Option<(i64,i64,i64)>=c.query_row("SELECT plan_id,amount_cents,EXISTS(SELECT 1 FROM payments WHERE obligation_id=o.id AND reversed_at IS NULL) FROM obligations o WHERE person_id=?1 AND period=?2",params![person_id,period],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional().map_err(|e|e.to_string())?;
        if let Some((p, a, paid)) = existing {
            return Ok(PaymentQuote {
                plan_id: Some(p),
                amount_cents: Some(a),
                already_paid: paid != 0,
            });
        }
        let plan_id=c.query_row("SELECT plan_id FROM payments WHERE person_id=?1 AND modality='monthly' AND reversed_at IS NULL AND period < ?2 ORDER BY period DESC,id DESC LIMIT 1",params![person_id,period],|r|r.get(0)).optional().map_err(|e|e.to_string())?;
        let amount = if let Some(id) = plan_id {
            c.query_row(
                "SELECT price_cents FROM plans WHERE id=?1 AND is_active=1",
                [id],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        } else {
            None
        };
        Ok(PaymentQuote {
            plan_id: if amount.is_some() { plan_id } else { None },
            amount_cents: amount,
            already_paid: false,
        })
    }
    pub fn payments_page(
        &self,
        month: &str,
        page: i64,
        page_size: i64,
    ) -> Result<PaymentPage, String> {
        if !Self::valid_period(month) || page < 1 || !(1..=100).contains(&page_size) {
            return Err("Parámetros de paginación inválidos".into());
        }
        let c = self.connection()?;
        let (total,collected,count):(i64,i64,i64)=c.query_row("SELECT COUNT(*),COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN amount_cents ELSE 0 END),0),COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN 1 ELSE 0 END),0) FROM payments WHERE substr(paid_at,1,7)=?1",[month],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).map_err(|e|e.to_string())?;
        let pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        let effective = if pages > 0 { page.min(pages) } else { 1 };
        let mut s=c.prepare("SELECT p.id,p.person_id,p.obligation_id,p.plan_id,p.plan_name,p.modality,p.period,p.amount_cents,p.paid_at,p.reversed_at,p.reversal_reason,pe.name||' '||pe.last_name FROM payments p JOIN people pe ON pe.id=p.person_id WHERE substr(p.paid_at,1,7)=?1 ORDER BY p.paid_at DESC,p.id DESC LIMIT ?2 OFFSET ?3").map_err(|e|e.to_string())?;
        let payments = s
            .query_map(
                params![month, page_size, (effective - 1) * page_size],
                payment_row,
            )
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(PaymentPage {
            payments,
            total,
            page: effective,
            page_size,
            total_pages: pages,
            collected_cents: collected,
            payment_count: count,
        })
    }
}
fn payment_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<Payment> {
    Ok(Payment {
        id: r.get(0)?,
        person_id: r.get(1)?,
        obligation_id: r.get(2)?,
        plan_id: r.get(3)?,
        plan_name: r.get(4)?,
        modality: r.get(5)?,
        period: r.get(6)?,
        amount_cents: r.get(7)?,
        paid_at: r.get(8)?,
        reversed_at: r.get(9)?,
        reversal_reason: r.get(10)?,
        person_name: r.get(11)?,
    })
}
