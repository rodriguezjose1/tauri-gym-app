use crate::models::dashboard::{
    DashboardSummary, PlanDistributionPoint, RevenuePoint, StudentPoint, StudentsTrend,
};
use crate::services::billing_service::BillingService;
use rusqlite::{params, Connection};

pub struct DashboardService {
    db_path: String,
}

impl DashboardService {
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

    fn validate(period: &str, months: Option<i64>) -> Result<(), String> {
        let valid = period.len() == 7
            && period.as_bytes()[4] == b'-'
            && period[..4].chars().all(|c| c.is_ascii_digit())
            && period[5..]
                .parse::<u8>()
                .is_ok_and(|m| (1..=12).contains(&m));
        if !valid {
            return Err("El período debe tener formato AAAA-MM".into());
        }
        if months.is_some_and(|value| !(1..=24).contains(&value)) {
            return Err("La cantidad de meses debe estar entre 1 y 24".into());
        }
        Ok(())
    }

    fn offset_period(period: &str, offset: i64) -> String {
        let year: i64 = period[..4].parse().unwrap_or_default();
        let month: i64 = period[5..].parse().unwrap_or(1);
        let absolute = year * 12 + month - 1 + offset;
        format!(
            "{:04}-{:02}",
            absolute.div_euclid(12),
            absolute.rem_euclid(12) + 1
        )
    }

    pub fn summary(&self, period: &str) -> Result<DashboardSummary, String> {
        Self::validate(period, None)?;
        let connection = self.connection()?;
        let active_students = connection.query_row(
            "SELECT CASE WHEN ?1=strftime('%Y-%m','now','localtime')
               THEN (SELECT COUNT(*) FROM people WHERE (deleted_at IS NULL OR deleted_at='') AND (is_active=1 OR is_active IS NULL))
               ELSE (SELECT COUNT(DISTINCT person_id) FROM person_activity_periods WHERE active_from<=?1 AND (inactive_from IS NULL OR inactive_from>?1)) END",
            [period], |row| row.get(0)).map_err(|e| e.to_string())?;
        let collected_cents = connection.query_row(
            "SELECT COALESCE(SUM(amount_cents),0) FROM payments WHERE reversed_at IS NULL AND substr(paid_at,1,7)=?1",
            [period], |row| row.get(0)).map_err(|e| e.to_string())?;
        let overdue = BillingService::obligation_overdue_predicate("o");
        let outstanding_sql = |overdue_only: bool| {
            format!(
            "SELECT COUNT(DISTINCT o.person_id) FROM obligations o
             WHERE o.period=?1 AND o.excluded_at IS NULL
               AND ((?1=strftime('%Y-%m','now','localtime') AND EXISTS(SELECT 1 FROM people pe WHERE pe.id=o.person_id AND (pe.deleted_at IS NULL OR pe.deleted_at='') AND (pe.is_active=1 OR pe.is_active IS NULL)))
                 OR (?1<>strftime('%Y-%m','now','localtime') AND EXISTS(SELECT 1 FROM person_activity_periods a WHERE a.person_id=o.person_id AND a.active_from<=?1 AND (a.inactive_from IS NULL OR a.inactive_from>?1))))
               AND NOT EXISTS(SELECT 1 FROM payments p WHERE p.obligation_id=o.id AND p.reversed_at IS NULL)
               AND {}({overdue})", if overdue_only { "" } else { "NOT " })
        };
        let pending_payments = connection
            .query_row(&outstanding_sql(false), [period], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let overdue_payments = connection
            .query_row(&outstanding_sql(true), [period], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let registered_sessions = connection.query_row(
            "SELECT COUNT(*) FROM (SELECT DISTINCT person_id,date(date) FROM workout_entries WHERE substr(date,1,7)=?1)",
            [period], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(DashboardSummary {
            period: period.into(),
            active_students,
            collected_cents,
            pending_payments,
            overdue_payments,
            registered_sessions,
        })
    }

    pub fn revenue_trend(&self, period: &str, months: i64) -> Result<Vec<RevenuePoint>, String> {
        Self::validate(period, Some(months))?;
        let start = Self::offset_period(period, 1 - months);
        let connection = self.connection()?;
        let mut statement = connection.prepare(
            "SELECT substr(paid_at,1,7),SUM(amount_cents) FROM payments WHERE reversed_at IS NULL AND substr(paid_at,1,7) BETWEEN ?1 AND ?2 GROUP BY substr(paid_at,1,7)"
        ).map_err(|e| e.to_string())?;
        let values = statement
            .query_map(params![start, period], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<std::collections::HashMap<_, _>, _>>()
            .map_err(|e| e.to_string())?;
        Ok((0..months)
            .map(|index| {
                let item_period = Self::offset_period(&start, index);
                RevenuePoint {
                    amount_cents: *values.get(&item_period).unwrap_or(&0),
                    period: item_period,
                }
            })
            .collect())
    }

    pub fn students_trend(&self, period: &str, months: i64) -> Result<StudentsTrend, String> {
        Self::validate(period, Some(months))?;
        let connection = self.connection()?;
        let reliable_from: Option<String> = connection
            .query_row(
                "SELECT MIN(substr(created_at,1,7)) FROM person_activity_periods",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let Some(reliable_from) = reliable_from else {
            return Ok(StudentsTrend {
                available: false,
                points: vec![],
            });
        };
        let start = Self::offset_period(period, 1 - months);
        let mut points = Vec::new();
        for index in 0..months {
            let item_period = Self::offset_period(&start, index);
            let count = if item_period < reliable_from {
                0
            } else {
                connection.query_row(
                    "SELECT CASE WHEN ?1=strftime('%Y-%m','now','localtime')
                   THEN (SELECT COUNT(*) FROM people WHERE (deleted_at IS NULL OR deleted_at='') AND (is_active=1 OR is_active IS NULL))
                   ELSE (SELECT COUNT(DISTINCT person_id) FROM person_activity_periods WHERE active_from<=?1 AND (inactive_from IS NULL OR inactive_from>?1)) END",
                    [&item_period], |row| row.get(0)).map_err(|e| e.to_string())?
            };
            points.push(StudentPoint {
                period: item_period,
                count,
            });
        }
        Ok(StudentsTrend {
            available: true,
            points,
        })
    }

    pub fn plan_distribution(&self, period: &str) -> Result<Vec<PlanDistributionPoint>, String> {
        Self::validate(period, None)?;
        let connection = self.connection()?;
        let mut statement = connection.prepare(
            "WITH active_people AS (
               SELECT id person_id FROM people WHERE ?1=strftime('%Y-%m','now','localtime') AND (deleted_at IS NULL OR deleted_at='') AND (is_active=1 OR is_active IS NULL)
               UNION
               SELECT DISTINCT person_id FROM person_activity_periods WHERE ?1<>strftime('%Y-%m','now','localtime') AND active_from<=?1 AND (inactive_from IS NULL OR inactive_from>?1)
             ), resolved AS (
               SELECT a.person_id,COALESCE(
                 (SELECT o.plan_id FROM obligations o JOIN plans po ON po.id=o.plan_id AND po.is_active=1 WHERE o.person_id=a.person_id AND o.period=?1 AND o.excluded_at IS NULL LIMIT 1),
                 (SELECT p.plan_id FROM payments p JOIN plans pp ON pp.id=p.plan_id AND pp.is_active=1 WHERE p.person_id=a.person_id AND p.modality='monthly' AND p.reversed_at IS NULL AND p.period<=?1 ORDER BY p.period DESC,p.id DESC LIMIT 1)
               ) plan_id FROM active_people a
             )
             SELECT r.plan_id,COALESCE(pl.name,'Sin plan asignado'),COUNT(*) FROM resolved r LEFT JOIN plans pl ON pl.id=r.plan_id GROUP BY r.plan_id,pl.name ORDER BY COUNT(*) DESC,pl.name"
        ).map_err(|e| e.to_string())?;
        let result = statement
            .query_map([period], |row| {
                Ok(PlanDistributionPoint {
                    plan_id: row.get(0)?,
                    plan_name: row.get(1)?,
                    count: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(result)
    }
}
