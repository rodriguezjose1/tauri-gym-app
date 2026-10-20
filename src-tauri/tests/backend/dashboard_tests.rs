use crate::dashboard_service::DashboardService;
use crate::database_migrations::migrate_database;
use rusqlite::{params, Connection};
use tempfile::tempdir;

fn fixture() -> (tempfile::TempDir, String, DashboardService) {
    let directory = tempdir().unwrap();
    let path = directory.path().join("dashboard.db");
    migrate_database(&path).unwrap();
    let path = path.to_string_lossy().to_string();
    (directory, path.clone(), DashboardService::new(&path))
}

#[test]
fn dashboard_uses_effective_payment_date_and_fills_empty_months() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    connection
        .execute(
            "INSERT INTO people(name,last_name,phone) VALUES('Ana','Test','1')",
            [],
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO person_activity_periods(person_id,active_from) VALUES(1,'2026-01')",
            [],
        )
        .unwrap();
    connection.execute("INSERT INTO plans(name,modality,price_cents,is_active) VALUES('Dos días','monthly',10000,1)", []).unwrap();
    connection.execute("INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(1,'2026-01',1,10000)", []).unwrap();
    connection.execute("INSERT INTO payments(person_id,obligation_id,plan_id,plan_name,modality,period,amount_cents,paid_at) VALUES(1,1,1,'Dos días','monthly','2026-01',10000,'2026-03-05 10:00:00')", []).unwrap();
    connection.execute("INSERT INTO payments(person_id,plan_id,plan_name,modality,amount_cents,paid_at,reversed_at,reversal_reason) VALUES(1,1,'Dos días','particular',5000,'2026-03-06 10:00:00','2026-03-07','error')", []).unwrap();
    drop(connection);

    let summary = service.summary("2026-03").unwrap();
    assert_eq!(
        (
            summary.active_students,
            summary.collected_cents,
            summary.registered_sessions
        ),
        (1, 10000, 0)
    );
    let trend = service.revenue_trend("2026-03", 3).unwrap();
    assert_eq!(
        trend
            .iter()
            .map(|point| (point.period.as_str(), point.amount_cents))
            .collect::<Vec<_>>(),
        vec![("2026-01", 0), ("2026-02", 0), ("2026-03", 10000)]
    );
}

#[test]
fn dashboard_combines_payments_and_active_sales_and_exposes_the_breakdown() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    connection.execute("INSERT INTO people(name,last_name,phone) VALUES('Ana','Test','1')", []).unwrap();
    connection.execute("INSERT INTO plans(name,modality,price_cents,is_active) VALUES('Pase','particular',70000,1)", []).unwrap();
    connection.execute("INSERT INTO payments(person_id,plan_id,plan_name,modality,amount_cents,paid_at) VALUES(1,1,'Pase','particular',70000,'2026-10-03 10:00:00')", []).unwrap();
    connection.execute("INSERT INTO sales(payment_method,total_amount_cents,total_cost_cents,sold_at) VALUES('cash',25000,10000,'2026-10-04 10:00:00')", []).unwrap();
    connection.execute("INSERT INTO sales(payment_method,total_amount_cents,total_cost_cents,sold_at,voided_at,void_reason) VALUES('cash',90000,30000,'2026-10-05 10:00:00','2026-11-01 10:00:00','Duplicada')", []).unwrap();
    connection.execute("INSERT INTO sales(payment_method,total_amount_cents,total_cost_cents,sold_at) VALUES('cash',15000,5000,'2026-09-04 10:00:00')", []).unwrap();
    drop(connection);

    let summary = service.summary("2026-10").unwrap();
    assert_eq!(summary.payments_collected_cents, 70000);
    assert_eq!(summary.sales_collected_cents, 25000);
    assert_eq!(summary.collected_cents, 95000);

    let trend = service.revenue_trend("2026-10", 2).unwrap();
    assert_eq!(
        trend
            .iter()
            .map(|point| (point.period.as_str(), point.amount_cents))
            .collect::<Vec<_>>(),
        vec![("2026-09", 15000), ("2026-10", 95000)]
    );
}

#[test]
fn dashboard_returns_zero_for_every_revenue_source_in_an_empty_month() {
    let (_directory, _path, service) = fixture();

    let summary = service.summary("2026-10").unwrap();
    assert_eq!(summary.payments_collected_cents, 0);
    assert_eq!(summary.sales_collected_cents, 0);
    assert_eq!(summary.collected_cents, 0);
    assert_eq!(
        service.revenue_trend("2026-10", 1).unwrap()[0].amount_cents,
        0
    );
}

#[test]
fn dashboard_rejects_a_combined_revenue_that_exceeds_the_integer_limit() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    connection.execute("INSERT INTO people(name,last_name,phone) VALUES('Ana','Test','1')", []).unwrap();
    connection.execute("INSERT INTO plans(name,modality,price_cents,is_active) VALUES('Pase','particular',1,1)", []).unwrap();
    connection.execute("INSERT INTO payments(person_id,plan_id,plan_name,modality,amount_cents,paid_at) VALUES(1,1,'Pase','particular',5000000000000000000,'2026-10-03 10:00:00')", []).unwrap();
    connection.execute("INSERT INTO sales(payment_method,total_amount_cents,total_cost_cents,sold_at) VALUES('cash',5000000000000000000,1,'2026-10-04 10:00:00')", []).unwrap();
    drop(connection);

    assert_eq!(
        service.summary("2026-10").unwrap_err(),
        "La recaudación mensual es demasiado grande"
    );
}

#[test]
fn dashboard_counts_activity_pending_and_current_plan_without_duplicates() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    for (name, active_from, inactive_from) in [
        ("Ana", "2025-12", None),
        ("Beto", "2025-12", Some("2026-01")),
        ("Caro", "2026-01", None),
    ] {
        connection
            .execute(
                "INSERT INTO people(name,last_name,phone) VALUES(?1,'Test','1')",
                [name],
            )
            .unwrap();
        connection.execute("INSERT INTO person_activity_periods(person_id,active_from,inactive_from) VALUES(last_insert_rowid(),?1,?2)", params![active_from, inactive_from]).unwrap();
    }
    connection.execute("INSERT INTO plans(name,modality,price_cents,is_active) VALUES('Tres días','monthly',20000,1)", []).unwrap();
    connection.execute("INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(1,'2026-02',1,20000)", []).unwrap();
    drop(connection);
    let summary = service.summary("2026-02").unwrap();
    assert_eq!(
        (
            summary.active_students,
            summary.pending_payments,
            summary.overdue_payments
        ),
        (2, 0, 1)
    );
    let distribution = service.plan_distribution("2026-02").unwrap();
    assert_eq!(
        distribution
            .iter()
            .map(|item| (item.plan_name.as_str(), item.count))
            .collect::<Vec<_>>(),
        vec![("Sin plan asignado", 1), ("Tres días", 1)]
    );
}

#[test]
fn dashboard_validates_period_and_month_limits() {
    let (_directory, _path, service) = fixture();
    assert!(service.summary("2026-13").is_err());
    assert!(service.revenue_trend("2026-01", 0).is_err());
    assert!(service.students_trend("2026-01", 25).is_err());
    assert!(service.inactive_students(8, 1, 10).is_err());
    assert!(service.inactive_students(7, 0, 10).is_err());
    assert!(service.inactive_students(7, 1, 101).is_err());
    assert!(service.attendance_ranking("2026-13", "month", 10).is_err());
    assert!(service
        .attendance_ranking("2026-10", "quarter", 10)
        .is_err());
    assert!(service.attendance_ranking("2026-10", "month", 0).is_err());
}

#[test]
fn attendance_ranking_counts_unique_days_in_period_and_keeps_historical_people() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    for name in ["Ana", "Beto", "Caro", "Sin sesiones"] {
        connection
            .execute(
                "INSERT INTO people(name,last_name,phone) VALUES(?1,'Test','1')",
                [name],
            )
            .unwrap();
    }
    connection
        .execute("UPDATE people SET is_active=0 WHERE id=1", [])
        .unwrap();
    connection
        .execute("UPDATE people SET deleted_at='2026-11-01' WHERE id=2", [])
        .unwrap();
    for index in 1..=15 {
        connection
            .execute(
                "INSERT INTO exercise(name,code,is_active) VALUES(?1,?2,1)",
                params![format!("Ejercicio {index}"), format!("E{index}")],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO workout_entries(person_id,exercise_id,date) VALUES(1,?1,'2026-09-03')",
                [index],
            )
            .unwrap();
    }
    for date in ["2026-09-01", "2026-09-05", "2026-09-20"] {
        connection
            .execute(
                "INSERT INTO workout_entries(person_id,exercise_id,date) VALUES(2,1,?1)",
                [date],
            )
            .unwrap();
    }
    for (person, date) in [
        (1, "2026-09-04"),
        (3, "2026-09-02"),
        (3, "2026-09-04"),
        (2, "2026-08-30"),
        (3, "2026-10-01"),
    ] {
        connection
            .execute(
                "INSERT INTO workout_entries(person_id,exercise_id,date) VALUES(?1,1,?2)",
                params![person, date],
            )
            .unwrap();
    }
    drop(connection);

    let ranking = service.attendance_ranking("2026-09", "month", 10).unwrap();
    assert_eq!(
        ranking
            .items
            .iter()
            .map(|item| (item.person_name.as_str(), item.sessions_count))
            .collect::<Vec<_>>(),
        vec![("Beto Test", 3), ("Ana Test", 2), ("Caro Test", 2)]
    );
    assert_eq!(service.summary("2026-09").unwrap().registered_sessions, 7);
    assert_eq!(
        service
            .attendance_ranking("2026-09", "month", 2)
            .unwrap()
            .items
            .len(),
        2
    );
    assert!(service
        .attendance_ranking("2027-01", "month", 10)
        .unwrap()
        .items
        .is_empty());
}

#[test]
fn attendance_ranking_calculates_year_and_rolling_twelve_month_ranges() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    connection
        .execute(
            "INSERT INTO people(name,last_name,phone) VALUES('Ana','Test','1')",
            [],
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO exercise(name,code,is_active) VALUES('Press','PRESS',1)",
            [],
        )
        .unwrap();
    for date in [
        "2025-09-30",
        "2025-10-01",
        "2026-01-01",
        "2026-02-29",
        "2026-09-30",
        "2026-10-01",
    ] {
        connection
            .execute(
                "INSERT INTO workout_entries(person_id,exercise_id,date) VALUES(1,1,?1)",
                [date],
            )
            .unwrap();
    }
    drop(connection);

    let year = service.attendance_ranking("2026-09", "year", 10).unwrap();
    assert_eq!(
        (year.range_start.as_str(), year.range_end_exclusive.as_str()),
        ("2026-01-01", "2026-10-01")
    );
    assert_eq!(year.items[0].sessions_count, 2); // 29/02/2026 es inválida y no cuenta.

    let rolling = service
        .attendance_ranking("2026-09", "rolling12", 10)
        .unwrap();
    assert_eq!(
        (
            rolling.range_start.as_str(),
            rolling.range_end_exclusive.as_str()
        ),
        ("2025-10-01", "2026-10-01")
    );
    assert_eq!(rolling.items[0].sessions_count, 3);

    let leap = service.attendance_ranking("2024-02", "month", 10).unwrap();
    assert_eq!(
        (leap.range_start.as_str(), leap.range_end_exclusive.as_str()),
        ("2024-02-01", "2024-03-01")
    );
}

#[test]
fn dashboard_separates_pending_overdue_and_counts_unique_sessions() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    for name in ["Ana", "Beto"] {
        connection
            .execute(
                "INSERT INTO people(name,last_name,phone) VALUES(?1,'Test','1')",
                [name],
            )
            .unwrap();
        connection.execute("INSERT INTO person_activity_periods(person_id,active_from) VALUES(last_insert_rowid(),'2026-01')", []).unwrap();
    }
    connection.execute("INSERT INTO plans(name,modality,price_cents,is_active) VALUES('Mensual','monthly',10000,1)", []).unwrap();
    connection.execute("INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(1,'2026-10',1,10000)", []).unwrap();
    connection.execute("INSERT INTO obligations(person_id,period,plan_id,amount_cents) VALUES(2,'2026-11',1,10000)", []).unwrap();
    connection
        .execute(
            "INSERT INTO exercise(name,code,is_active) VALUES('Press','PRESS',1)",
            [],
        )
        .unwrap();
    for (person, date) in [
        (1, "2026-10-05"),
        (1, "2026-10-05"),
        (1, "2026-10-06"),
        (2, "2026-10-05"),
    ] {
        connection
            .execute(
                "INSERT INTO workout_entries(person_id,exercise_id,date) VALUES(?1,1,?2)",
                params![person, date],
            )
            .unwrap();
    }
    drop(connection);

    let october = service.summary("2026-10").unwrap();
    assert_eq!(
        (
            october.pending_payments,
            october.overdue_payments,
            october.registered_sessions
        ),
        (0, 1, 3)
    );
    let november = service.summary("2026-11").unwrap();
    assert_eq!(
        (november.pending_payments, november.overdue_payments),
        (1, 0)
    );
    let trend = service.students_trend("2026-12", 6).unwrap();
    assert_eq!(trend.points.len(), 6);
    assert_eq!(
        trend
            .points
            .iter()
            .map(|point| point.count)
            .collect::<Vec<_>>(),
        vec![0, 0, 0, 2, 2, 2]
    );
}

#[test]
fn inactive_students_use_latest_valid_session_and_current_active_people() {
    let (_directory, path, service) = fixture();
    let connection = Connection::open(path).unwrap();
    for name in [
        "Exacta", "Reciente", "Nunca", "Inactiva", "Futura", "Antigua",
    ] {
        connection
            .execute(
                "INSERT INTO people(name,last_name,phone) VALUES(?1,'Test','1')",
                [name],
            )
            .unwrap();
    }
    connection
        .execute("UPDATE people SET is_active=0 WHERE id=4", [])
        .unwrap();
    connection
        .execute(
            "INSERT INTO exercise(name,code,is_active) VALUES('Press','PRESS',1)",
            [],
        )
        .unwrap();
    for (person, modifier) in [
        (1, "-7 days"),
        (1, "-20 days"),
        (2, "-6 days"),
        (4, "-30 days"),
        (5, "+2 days"),
        (6, "-30 days"),
    ] {
        connection.execute(
            "INSERT INTO workout_entries(person_id,exercise_id,date) VALUES(?1,1,date('now','localtime',?2))",
            params![person, modifier],
        ).unwrap();
    }
    // Varios ejercicios el mismo día siguen representando una única última sesión.
    connection
        .execute(
            "INSERT INTO exercise(name,code,is_active) VALUES('Remo','REMO',1)",
            [],
        )
        .unwrap();
    connection.execute("INSERT INTO workout_entries(person_id,exercise_id,date) VALUES(1,2,date('now','localtime','-7 days'))", []).unwrap();
    drop(connection);

    let result = service.inactive_students(7, 1, 1).unwrap();
    assert_eq!(result.inactive_students_count, 2);
    assert_eq!(result.total_pages, 2);
    assert_eq!(result.max_days_inactive, Some(30));
    assert_eq!(result.items[0].person_name, "Antigua Test");
    assert_eq!(result.items[0].days_inactive, 30);

    let second_page = service.inactive_students(7, 2, 1).unwrap();
    assert_eq!(second_page.items[0].person_name, "Exacta Test");
    assert_eq!(second_page.items[0].days_inactive, 7);
    assert!(second_page.has_session_data);
}
