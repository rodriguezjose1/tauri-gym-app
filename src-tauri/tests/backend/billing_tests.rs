use crate::billing::{PaymentRequest, Plan};
use crate::billing_service::BillingService;
use crate::database_migrations::migrate_database;
use rusqlite::Connection;
use tempfile::tempdir;

fn fixture() -> (tempfile::TempDir, String, BillingService) {
    let d = tempdir().unwrap();
    let p = d.path().join("gym.db");
    migrate_database(&p).unwrap();
    let s = p.to_string_lossy().to_string();
    let c = Connection::open(&p).unwrap();
    c.execute(
        "INSERT INTO people(name,last_name,phone) VALUES('Ana','Test','1')",
        [],
    )
    .unwrap();
    drop(c);
    let service = BillingService::new(&s);
    (d, s, service)
}
fn plan(s: &BillingService, name: &str, modality: &str, price: i64) -> i64 {
    s.save_plan(Plan {
        id: None,
        name: name.into(),
        modality: modality.into(),
        price_cents: price,
        is_active: true,
    })
    .unwrap()
    .id
    .unwrap()
}

#[test]
fn first_payment_creates_idempotent_obligation() {
    let (_d, _p, s) = fixture();
    let id = plan(&s, "Mensual", "monthly", 10000);
    s.record_payment(PaymentRequest {
        person_id: 1,
        modality: "monthly".into(),
        period: Some("2026-10".into()),
        plan_id: id,
        amount_cents: 10000,
    })
    .unwrap();
    let a = s.ensure_obligation(1, "2026-10").unwrap();
    let b = s.ensure_obligation(1, "2026-10").unwrap();
    assert_eq!(a.id, b.id);
    assert_eq!(a.amount_cents, 10000)
}
#[test]
fn latest_previous_monthly_payment_drives_plan_and_particular_is_ignored() {
    let (_d, _p, s) = fixture();
    let b = plan(&s, "B", "monthly", 12000);
    let particular = plan(&s, "Clase", "particular", 3000);
    s.record_payment(PaymentRequest {
        person_id: 1,
        modality: "monthly".into(),
        period: Some("2026-08".into()),
        plan_id: b,
        amount_cents: 12000,
    })
    .unwrap();
    s.record_payment(PaymentRequest {
        person_id: 1,
        modality: "particular".into(),
        period: None,
        plan_id: particular,
        amount_cents: 3000,
    })
    .unwrap();
    assert_eq!(s.ensure_obligation(1, "2026-09").unwrap().plan_id, b)
}
#[test]
fn monthly_adjustment_duplicate_prevention_and_reversal_work() {
    let (_d, _p, s) = fixture();
    let a = plan(&s, "A", "monthly", 10000);
    let p = s
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-10".into()),
            plan_id: a,
            amount_cents: 9000,
        })
        .unwrap();
    assert!(s
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-10".into()),
            plan_id: a,
            amount_cents: 9000
        })
        .is_err());
    s.reverse_payment(p.id, "error de carga").unwrap();
    assert!(!s.ensure_obligation(1, "2026-10").unwrap().paid);
    assert_eq!(
        s.ensure_obligation(1, "2026-10").unwrap().amount_cents,
        9000
    );
    assert!(s
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-10".into()),
            plan_id: a,
            amount_cents: 9000
        })
        .is_ok())
}
#[test]
fn reversing_latest_payment_restores_previous_plan_resolution() {
    let (_d, _p, s) = fixture();
    let a = plan(&s, "A", "monthly", 10000);
    let b = plan(&s, "B", "monthly", 12000);
    s.record_payment(PaymentRequest {
        person_id: 1,
        modality: "monthly".into(),
        period: Some("2026-07".into()),
        plan_id: a,
        amount_cents: 10000,
    })
    .unwrap();
    let p = s
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-08".into()),
            plan_id: b,
            amount_cents: 12000,
        })
        .unwrap();
    s.reverse_payment(p.id, "anulado").unwrap();
    assert_eq!(s.ensure_obligation(1, "2026-09").unwrap().plan_id, a)
}
#[test]
fn data_persists_after_service_reopen() {
    let (_d, p, s) = fixture();
    let a = plan(&s, "Clase", "particular", 3000);
    s.record_payment(PaymentRequest {
        person_id: 1,
        modality: "particular".into(),
        period: None,
        plan_id: a,
        amount_cents: 3000,
    })
    .unwrap();
    drop(s);
    assert_eq!(BillingService::new(&p).list_payments().unwrap().len(), 1)
}
#[test]
fn composite_failure_rolls_back_obligation_adjustment() {
    let (_d, p, s) = fixture();
    let a = plan(&s, "A", "monthly", 10000);
    s.record_payment(PaymentRequest { person_id:1, modality:"monthly".into(), period:Some("2026-09".into()), plan_id:a, amount_cents:10000 }).unwrap();
    let o = s.ensure_obligation(1, "2026-10").unwrap();
    let c = Connection::open(&p).unwrap();
    c.execute_batch("CREATE TRIGGER reject_payment BEFORE INSERT ON payments BEGIN SELECT RAISE(ABORT,'forced'); END;").unwrap();
    drop(c);
    assert!(s
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-10".into()),
            plan_id: a,
            amount_cents: 9000
        })
        .is_err());
    assert_eq!(
        s.ensure_obligation(1, "2026-10").unwrap().amount_cents,
        o.amount_cents
    )
}
#[test]
fn first_monthly_payment_without_initial_plan_uses_explicit_selection() {
    let (_d, _p, s) = fixture();
    let a = plan(&s, "A", "monthly", 10000);
    let payment = s
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-10".into()),
            plan_id: a,
            amount_cents: 9500,
        })
        .unwrap();
    assert_eq!(payment.plan_id, a);
    assert_eq!(
        s.ensure_obligation(1, "2026-10").unwrap().amount_cents,
        9500
    );
}
#[test]
fn paginated_history_and_summary_use_effective_payment_month() {
    let (_d, p, s) = fixture();
    let a = plan(&s, "Clase", "particular", 1000);
    for _ in 0..25 {
        s.record_payment(PaymentRequest {
            person_id: 1,
            modality: "particular".into(),
            period: None,
            plan_id: a,
            amount_cents: 1000,
        })
        .unwrap();
    }
    let c = Connection::open(&p).unwrap();
    c.execute("UPDATE payments SET paid_at='2026-10-15 12:00:00'", [])
        .unwrap();
    drop(c);
    s.reverse_payment(1, "error").unwrap();
    let first = s.payments_page("2026-10", 1, 20).unwrap();
    let second = s.payments_page("2026-10", 2, 20).unwrap();
    assert_eq!(
        (
            first.total,
            first.total_pages,
            first.payments.len(),
            second.payments.len()
        ),
        (25, 2, 20, 5)
    );
    assert_eq!((first.payment_count, first.collected_cents), (24, 24000));
}
#[test]
fn empty_payment_month_returns_zero_summary() {
    let (_d, _p, s) = fixture();
    let page = s.payments_page("2026-10", 1, 20).unwrap();
    assert!(page.payments.is_empty());
    assert_eq!(
        (
            page.total,
            page.total_pages,
            page.payment_count,
            page.collected_cents
        ),
        (0, 0, 0, 0)
    );
}
