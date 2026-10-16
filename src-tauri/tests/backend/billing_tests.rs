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
    }, None)
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

fn adjacent_period(period: &str, offset: i32) -> String {
    let year: i32 = period[0..4].parse().unwrap();
    let month: i32 = period[5..7].parse().unwrap();
    let absolute = year * 12 + month - 1 + offset;
    format!("{:04}-{:02}", absolute.div_euclid(12), absolute.rem_euclid(12) + 1)
}

fn local_period(path: &str) -> String {
    Connection::open(path)
        .unwrap()
        .query_row("SELECT strftime('%Y-%m','now','localtime')", [], |row| row.get(0))
        .unwrap()
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
fn plans_are_paginated_in_the_backend_and_out_of_range_pages_are_clamped() {
    let (_d, _path, service) = fixture();
    for index in 1..=10 {
        plan(&service, &format!("Plan {index:02}"), "monthly", 1000 + index);
    }

    let first = service.plans_page(1, 8).unwrap();
    let second = service.plans_page(2, 8).unwrap();
    let clamped = service.plans_page(99, 8).unwrap();

    assert_eq!((first.total, first.total_pages, first.page, first.plans.len()), (10, 2, 1, 8));
    assert_eq!((second.page, second.plans.len()), (2, 2));
    assert_eq!((clamped.page, clamped.plans.len()), (2, 2));
}

#[test]
fn active_people_payment_filters_counts_search_and_paginate_consistently() {
    let (_d, path, service) = fixture();
    let connection = Connection::open(&path).unwrap();
    for name in ["Actual", "Pendiente", "Vencido", "Inactivo", "Vencido Dos"] {
        connection.execute("INSERT INTO people(name,last_name,phone) VALUES(?1,'Test','1')", [name]).unwrap();
    }
    connection.execute("UPDATE people SET is_active=0,deleted_at=datetime('now') WHERE name='Inactivo'", []).unwrap();
    drop(connection);

    let monthly = plan(&service, "Mensual filtros", "monthly", 40000);
    let current = local_period(&path);
    let previous = adjacent_period(&current, -1);
    let future = adjacent_period(&current, 1);
    for person_id in [2, 3, 4, 6] {
        service.record_payment(PaymentRequest { person_id, modality: "monthly".into(), period: Some(current.clone()), plan_id: monthly, amount_cents: 40000 }).unwrap();
    }
    let connection = Connection::open(&path).unwrap();
    connection.execute("INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(3,?1,?2,40000)", rusqlite::params![future, monthly]).unwrap();
    for person_id in [4, 6] {
        connection.execute("INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(?1,?2,?3,40000)", rusqlite::params![person_id, previous, monthly]).unwrap();
        connection.execute("INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(?1,?2,?3,40000)", rusqlite::params![person_id, future, monthly]).unwrap();
    }
    drop(connection);

    let counts = service.payment_status_counts().unwrap();
    assert_eq!((counts.all, counts.overdue, counts.pending, counts.current, counts.no_plan), (5, 2, 1, 1, 1));
    for (status, expected) in [("overdue", 2), ("pending", 1), ("current", 1), ("no_plan", 1)] {
        let page = service.persons_payment_page("", status, 1, 10, None).unwrap();
        assert_eq!(page.total, expected);
        assert!(page.persons.iter().all(|person| person.payment_status == status));
    }
    let searched = service.persons_payment_page("dos", "overdue", 1, 10, None).unwrap();
    assert_eq!((searched.total, searched.persons[0].person.name.as_str()), (1, "Vencido Dos"));
    let second = service.persons_payment_page("", "overdue", 2, 1, None).unwrap();
    assert_eq!((second.total, second.total_pages, second.page, second.persons.len()), (2, 2, 2, 1));
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
fn development_generation_previews_applies_and_rolls_back_exact_obligations() {
    let (_d, path, service) = fixture();
    activity(&path, "2026-10", None);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    service
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-10".into()),
            plan_id: monthly,
            amount_cents: 40000,
        })
        .unwrap();

    let preview = service.dev_preview_reconciliation("2026-11").unwrap();
    assert_eq!(preview.items.len(), 1);
    assert_eq!(preview.items[0].period, "2026-11");
    assert_eq!(preview.total_amount_cents, 40000);
    assert_eq!(service.person_history(1, 1, 20).unwrap().total, 1);

    let applied = service.dev_apply_reconciliation("2026-11").unwrap();
    assert_eq!(applied.items.len(), 1);
    assert_eq!(service.person_history(1, 1, 20).unwrap().total, 2);
    assert_eq!(
        service
            .dev_rollback_reconciliation(&applied.items)
            .unwrap(),
        1
    );
    assert_eq!(service.person_history(1, 1, 20).unwrap().total, 1);
}

#[test]
fn development_rollback_refuses_obligations_with_any_payment() {
    let (_d, path, service) = fixture();
    activity(&path, "2026-10", None);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    service
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-10".into()),
            plan_id: monthly,
            amount_cents: 40000,
        })
        .unwrap();
    let applied = service.dev_apply_reconciliation("2026-11").unwrap();
    service
        .record_payment(PaymentRequest {
            person_id: 1,
            modality: "monthly".into(),
            period: Some("2026-11".into()),
            plan_id: monthly,
            amount_cents: 40000,
        })
        .unwrap();

    let error = service
        .dev_rollback_reconciliation(&applied.items)
        .unwrap_err();
    assert!(error.contains("pagos asociados"));
    assert_eq!(service.person_history(1, 1, 20).unwrap().total, 2);
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
    let first = s.payments_page("2026-10", "", 1, 20).unwrap();
    let second = s.payments_page("2026-10", "", 2, 20).unwrap();
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
fn payment_search_filters_people_before_paginating_and_keeps_monthly_summary() {
    let (_d, path, service) = fixture();
    let particular = plan(&service, "Clase", "particular", 1000);
    let connection = Connection::open(&path).unwrap();
    connection
        .execute(
            "INSERT INTO people(name,last_name,phone) VALUES('Bruno','Gómez','2')",
            [],
        )
        .unwrap();
    drop(connection);

    for person_id in [1, 1, 2] {
        service
            .record_payment(PaymentRequest {
                person_id,
                modality: "particular".into(),
                period: None,
                plan_id: particular,
                amount_cents: 1000,
            })
            .unwrap();
    }
    let connection = Connection::open(&path).unwrap();
    connection
        .execute("UPDATE payments SET paid_at='2026-10-15 12:00:00'", [])
        .unwrap();

    let filtered = service.payments_page("2026-10", "  ana  ", 1, 1).unwrap();
    assert_eq!((filtered.total, filtered.total_pages), (2, 2));
    assert_eq!(filtered.payments.len(), 1);
    assert_eq!(filtered.payments[0].person_name, "Ana Test");
    assert_eq!((filtered.payment_count, filtered.collected_cents), (3, 3000));

    let cleared = service.payments_page("2026-10", "", 1, 20).unwrap();
    assert_eq!(cleared.total, 3);
}
#[test]
fn empty_payment_month_returns_zero_summary() {
    let (_d, _p, s) = fixture();
    let page = s.payments_page("2026-10", "", 1, 20).unwrap();
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
    let october = service.payments_page("2026-10", "", 1, 20).unwrap();
    let november = service.payments_page("2026-11", "", 1, 20).unwrap();
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

    let november = service.payments_page("2026-11", "", 1, 20).unwrap();
    assert_eq!(november.collected_cents, 132000);
    assert_eq!(november.period_paid_cents, 35000);
    assert_eq!(november.payment_count, 4);
    assert_eq!(november.total, 5);

    let december = service.payments_page("2026-12", "", 1, 20).unwrap();
    assert_eq!(december.collected_cents, 0);
    assert_eq!(december.period_paid_cents, 45000);
    assert_eq!(december.payment_count, 0);
}

#[test]
fn monthly_price_change_from_next_month_preserves_current_and_updates_generated_future() {
    let (_d, path, service) = fixture();
    let current = local_period(&path);
    let next = adjacent_period(&current, 1);
    let later = adjacent_period(&current, 3);
    activity(&path, &current, None);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    service.record_payment(PaymentRequest {
        person_id: 1,
        modality: "monthly".into(),
        period: Some(current.clone()),
        plan_id: monthly,
        amount_cents: 40000,
    }).unwrap();
    service.reconcile_through(&next).unwrap();

    service.save_plan(Plan {
        id: Some(monthly),
        name: "Mensual".into(),
        modality: "monthly".into(),
        price_cents: 45000,
        is_active: true,
    }, Some(&next)).unwrap();

    assert_eq!(service.quote_payment(1, &current, None).unwrap().amount_cents, Some(40000));
    assert_eq!(service.quote_payment(1, &next, None).unwrap().amount_cents, Some(45000));
    assert_eq!(service.reconcile_through(&next).unwrap(), 0);
    assert_eq!(service.reconcile_through(&later).unwrap(), 2);
    for period in [adjacent_period(&current, 2), later] {
        assert_eq!(service.quote_payment(1, &period, None).unwrap().amount_cents, Some(45000));
    }
}

#[test]
fn current_month_price_change_only_updates_unprotected_periods_from_its_vigency() {
    let (_d, path, service) = fixture();
    let current = local_period(&path);
    let previous = adjacent_period(&current, -1);
    let next = adjacent_period(&current, 1);
    let future = adjacent_period(&current, 2);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    let connection = Connection::open(&path).unwrap();
    connection.execute("INSERT INTO people(name,last_name,phone) VALUES('Berta','Test','2')", []).unwrap();
    for (person, period, excluded) in [
        (1, previous.as_str(), false),
        (1, current.as_str(), true),
        (1, next.as_str(), false),
        (1, future.as_str(), false),
        (2, current.as_str(), false),
    ] {
        connection.execute(
            "INSERT INTO obligations(person_id,period,plan_id,amount_cents,excluded_at) VALUES(?1,?2,?3,40000,CASE WHEN ?4 THEN datetime('now','localtime') END)",
            rusqlite::params![person, period, monthly, excluded],
        ).unwrap();
    }
    let reversed_obligation: i64 = connection.query_row(
        "SELECT id FROM obligations WHERE person_id=1 AND period=?1", [&next], |row| row.get(0),
    ).unwrap();
    connection.execute(
        "INSERT INTO payments(person_id,obligation_id,plan_id,plan_name,modality,period,amount_cents,paid_at,reversed_at,reversal_reason) VALUES(1,?1,?2,'Mensual','monthly',?3,40000,datetime('now','localtime'),datetime('now','localtime'),'prueba')",
        rusqlite::params![reversed_obligation, monthly, next],
    ).unwrap();
    drop(connection);

    service.save_plan(Plan {
        id: Some(monthly), name: "Mensual actualizado".into(), modality: "monthly".into(),
        price_cents: 45000, is_active: true,
    }, Some(&current)).unwrap();

    let connection = Connection::open(path).unwrap();
    let amount = |person: i64, period: &str| -> i64 {
        connection.query_row(
            "SELECT amount_cents FROM obligations WHERE person_id=?1 AND period=?2",
            rusqlite::params![person, period], |row| row.get(0),
        ).unwrap()
    };
    assert_eq!(amount(1, &previous), 40000);
    assert_eq!(amount(1, &current), 40000);
    assert_eq!(amount(1, &next), 40000);
    assert_eq!(amount(1, &future), 45000);
    assert_eq!(amount(2, &current), 45000);
}

#[test]
fn particular_price_change_is_immediate_and_preserves_previous_payments() {
    let (_d, _path, service) = fixture();
    let particular = plan(&service, "Particular", "particular", 12000);
    let payment = service.record_payment(PaymentRequest {
        person_id: 1, modality: "particular".into(), period: None,
        plan_id: particular, amount_cents: 12000,
    }).unwrap();

    service.save_plan(Plan {
        id: Some(particular), name: "Particular".into(), modality: "particular".into(),
        price_cents: 15000, is_active: true,
    }, None).unwrap();

    assert_eq!(service.list_payments().unwrap().into_iter().find(|item| item.id == payment.id).unwrap().amount_cents, 12000);
    assert_eq!(service.list_plans(false).unwrap().into_iter().find(|item| item.id == Some(particular)).unwrap().price_cents, 15000);
}

#[test]
fn successive_monthly_changes_keep_the_price_for_each_vigency() {
    let (_d, path, service) = fixture();
    let current = local_period(&path);
    let next = adjacent_period(&current, 1);
    let monthly = plan(&service, "Mensual", "monthly", 40000);
    let connection = Connection::open(&path).unwrap();
    for period in [&current, &next] {
        connection.execute(
            "INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(1,?1,?2,40000)",
            rusqlite::params![period, monthly],
        ).unwrap();
    }
    drop(connection);

    service.save_plan(Plan {
        id: Some(monthly), name: "Mensual".into(), modality: "monthly".into(),
        price_cents: 45000, is_active: true,
    }, Some(&next)).unwrap();
    service.save_plan(Plan {
        id: Some(monthly), name: "Mensual".into(), modality: "monthly".into(),
        price_cents: 42000, is_active: true,
    }, Some(&current)).unwrap();

    let connection = Connection::open(path).unwrap();
    let prices = connection.prepare(
        "SELECT period,amount_cents FROM obligations ORDER BY period",
    ).unwrap().query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)))
        .unwrap().collect::<Result<Vec<_>, _>>().unwrap();
    assert_eq!(prices, vec![(current, 42000), (next, 45000)]);
}

#[test]
fn failed_plan_update_rolls_back_price_history_and_name_only_edit_adds_no_vigency() {
    let (_d, path, service) = fixture();
    let current = local_period(&path);
    let first = plan(&service, "Plan A", "monthly", 40000);
    let _second = plan(&service, "Plan B", "monthly", 50000);

    service.save_plan(Plan {
        id: Some(first), name: "Plan A renombrado".into(), modality: "monthly".into(),
        price_cents: 40000, is_active: true,
    }, None).unwrap();
    let before: i64 = Connection::open(&path).unwrap().query_row(
        "SELECT COUNT(*) FROM plan_price_history WHERE plan_id=?1", [first], |row| row.get(0),
    ).unwrap();

    assert!(service.save_plan(Plan {
        id: Some(first), name: "Plan B".into(), modality: "monthly".into(),
        price_cents: 45000, is_active: true,
    }, Some(&current)).is_err());

    let connection = Connection::open(path).unwrap();
    let plan_state: (String, i64) = connection.query_row(
        "SELECT name,price_cents FROM plans WHERE id=?1", [first],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).unwrap();
    let after: i64 = connection.query_row(
        "SELECT COUNT(*) FROM plan_price_history WHERE plan_id=?1", [first], |row| row.get(0),
    ).unwrap();
    assert_eq!(plan_state, ("Plan A renombrado".into(), 40000));
    assert_eq!(before, after);
}

#[test]
fn payment_quote_uses_selected_plan_history_and_prefers_persisted_obligation_amount() {
    let (_d, path, service) = fixture();
    let current = local_period(&path);
    let next = adjacent_period(&current, 1);
    let monthly = plan(&service, "X1", "monthly", 30000);
    let alternate = plan(&service, "X2", "monthly", 25000);
    service.save_plan(Plan {
        id: Some(monthly), name: "X1".into(), modality: "monthly".into(),
        price_cents: 32000, is_active: true,
    }, Some(&next)).unwrap();

    let october_quote = service.quote_payment(1, &current, Some(monthly)).unwrap();
    let november_quote = service.quote_payment(1, &next, Some(monthly)).unwrap();
    assert_eq!(october_quote.amount_cents, Some(30000));
    assert_eq!(november_quote.amount_cents, Some(32000));

    let connection = Connection::open(&path).unwrap();
    connection.execute("INSERT INTO people(name,last_name,phone) VALUES('Berta','Test','2')", []).unwrap();
    connection.execute(
        "INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(1,?1,?2,28500)",
        rusqlite::params![current, monthly],
    ).unwrap();
    drop(connection);
    let persisted_quote = service.quote_payment(1, &current, Some(alternate)).unwrap();
    assert_eq!(persisted_quote.plan_id, Some(alternate));
    assert_eq!(persisted_quote.amount_cents, Some(25000));
    assert_eq!(
        service.quote_payment(1, &current, Some(monthly)).unwrap().amount_cents,
        Some(28500),
    );

    let suggested = service.quote_payment(2, &current, Some(monthly)).unwrap().amount_cents.unwrap();
    let payment = service.record_payment(PaymentRequest {
        person_id: 2, modality: "monthly".into(), period: Some(current),
        plan_id: monthly, amount_cents: suggested,
    }).unwrap();
    assert_eq!(payment.amount_cents, 30000);
}
