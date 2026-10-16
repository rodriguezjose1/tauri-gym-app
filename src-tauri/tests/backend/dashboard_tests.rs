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
