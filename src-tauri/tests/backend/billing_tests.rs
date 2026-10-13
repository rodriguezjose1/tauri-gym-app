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

fn activity(path: &str, from: &str, until: Option<&str>) {
    let connection = Connection::open(path).unwrap();
    connection.execute(
        "INSERT INTO person_activity_periods(person_id,active_from,inactive_from) VALUES(1,?1,?2)",
        rusqlite::params![from, until],
    ).unwrap();
}

#[test]
fn reconciliation_skips_people_without_a_monthly_payment() {
    let (_d, path, service) = fixture();
    activity(&path, "2026-01", None);
    assert_eq!(service.reconcile_through("2026-04").unwrap(), 0);
    assert_eq!(service.person_history(1, 1, 20).unwrap().total, 0);
}

#[test]
fn monthly_due_date_moves_weekends_to_monday() {
    let (_d, _path, service) = fixture();
    assert_eq!(service.monthly_due_date("2026-10").unwrap(), "2026-10-12");
    assert_eq!(service.monthly_due_date("2026-05").unwrap(), "2026-05-11");
    assert_eq!(service.monthly_due_date("2026-11").unwrap(), "2026-11-10");
}

#[test]
fn reconciliation_recovers_missing_months_and_is_idempotent() {
    let (_d, path, service) = fixture();
    activity(&path, "2026-10", None);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    service.record_payment(PaymentRequest { person_id: 1, modality: "monthly".into(), period: Some("2026-10".into()), plan_id: monthly, amount_cents: 40000 }).unwrap();
    assert_eq!(service.reconcile_through("2027-01").unwrap(), 3);
    assert_eq!(service.reconcile_through("2027-01").unwrap(), 0);
    let history = service.person_history(1, 1, 20).unwrap();
    assert_eq!(history.total, 4);
    assert_eq!(history.items.iter().filter(|item| item.status == "paid").count(), 1);
}

#[test]
fn exclusion_and_restoration_change_status_without_creating_payments() {
    let (_d, path, service) = fixture();
    activity(&path, "2020-01", None);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    service.record_payment(PaymentRequest { person_id: 1, modality: "monthly".into(), period: Some("2020-01".into()), plan_id: monthly, amount_cents: 40000 }).unwrap();
    service.reconcile_through("2020-02").unwrap();
    let period = service.person_history(1, 1, 20).unwrap().items.into_iter().find(|item| item.period.as_deref() == Some("2020-02")).unwrap();
    assert_eq!(service.payment_statuses(&[1]).unwrap()[0].status, "overdue");
    service.set_period_excluded(period.obligation_id.unwrap(), true).unwrap();
    assert_eq!(service.payment_statuses(&[1]).unwrap()[0].status, "current");
    service.set_period_excluded(period.obligation_id.unwrap(), false).unwrap();
    assert_eq!(service.payment_statuses(&[1]).unwrap()[0].status, "overdue");
    assert_eq!(service.list_payments().unwrap().len(), 1);
}

#[test]
fn inactive_months_are_not_generated_after_reactivation() {
    let (_d, path, service) = fixture();
    activity(&path, "2026-10", Some("2026-12"));
    activity(&path, "2027-04", None);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    service.record_payment(PaymentRequest { person_id: 1, modality: "monthly".into(), period: Some("2026-10".into()), plan_id: monthly, amount_cents: 40000 }).unwrap();
    service.reconcile_through("2027-04").unwrap();
    let periods = service.person_history(1, 1, 20).unwrap().items.into_iter().filter_map(|item| item.period).collect::<Vec<_>>();
    assert!(periods.contains(&"2026-11".into()) && periods.contains(&"2026-12".into()) && periods.contains(&"2027-04".into()));
    assert!(!periods.contains(&"2027-01".into()) && !periods.contains(&"2027-02".into()) && !periods.contains(&"2027-03".into()));
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

#[test]
fn monthly_summary_uses_the_payment_period_instead_of_registration_month() {
    let (_d, path, service) = fixture();
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    service.record_payment(PaymentRequest {
        person_id: 1,
        modality: "monthly".into(),
        period: Some("2026-10".into()),
        plan_id: monthly,
        amount_cents: 40000,
    }).unwrap();
    let connection = Connection::open(path).unwrap();
    connection.execute("UPDATE payments SET paid_at='2026-11-03 10:00:00'", []).unwrap();
    let october = service.payments_page("2026-10", 1, 20).unwrap();
    let november = service.payments_page("2026-11", 1, 20).unwrap();
    assert_eq!(october.collected_cents, 0);
    assert_eq!(october.period_paid_cents, 40000);
    assert_eq!(november.collected_cents, 40000);
    assert_eq!(november.period_paid_cents, 0);
}

#[test]
fn monthly_metrics_separate_cash_flow_from_paid_periods() {
    let (_d, path, service) = fixture();
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    let particular = plan(&service, "Particular", "particular", 12000);
    for (period, amount) in [("2026-10", 40000), ("2026-11", 35000), ("2026-12", 45000)] {
        service.record_payment(PaymentRequest { person_id: 1, modality: "monthly".into(), period: Some(period.into()), plan_id: monthly, amount_cents: amount }).unwrap();
    }
    service.record_payment(PaymentRequest { person_id: 1, modality: "particular".into(), period: None, plan_id: particular, amount_cents: 12000 }).unwrap();
    let reversed = service.record_payment(PaymentRequest { person_id: 1, modality: "particular".into(), period: None, plan_id: particular, amount_cents: 5000 }).unwrap();
    let connection = Connection::open(path).unwrap();
    connection.execute("UPDATE payments SET paid_at='2026-11-15 10:00:00'", []).unwrap();
    drop(connection);
    service.reverse_payment(reversed.id, "prueba").unwrap();

    let november = service.payments_page("2026-11", 1, 20).unwrap();
    assert_eq!(november.collected_cents, 132000);
    assert_eq!(november.period_paid_cents, 35000);
    assert_eq!(november.payment_count, 4);
    assert_eq!(november.total, 5);

    let december = service.payments_page("2026-12", 1, 20).unwrap();
    assert_eq!(december.collected_cents, 0);
    assert_eq!(december.period_paid_cents, 45000);
    assert_eq!(december.payment_count, 0);
}
