use crate::models::dashboard::{
    AttendanceRankingEntry, AttendanceRankingResponse, DashboardSummary, InactiveStudent,
    InactiveStudentsPage, PlanDistributionPoint, RevenuePoint, StudentPoint, StudentsTrend,
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
        let payments_collected_cents: i64 = connection.query_row(
            "SELECT COALESCE(SUM(amount_cents),0) FROM payments WHERE reversed_at IS NULL AND substr(paid_at,1,7)=?1",
            [period], |row| row.get(0)).map_err(|e| e.to_string())?;
        let sales_collected_cents: i64 = connection.query_row(
            "SELECT COALESCE(SUM(total_amount_cents),0) FROM sales WHERE voided_at IS NULL AND substr(sold_at,1,7)=?1",
            [period], |row| row.get(0)).map_err(|e| e.to_string())?;
        let collected_cents = payments_collected_cents
            .checked_add(sales_collected_cents)
            .ok_or("La recaudación mensual es demasiado grande")?;
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
            "SELECT COUNT(*) FROM (
               SELECT person_id,date(date,'+0 days') FROM workout_entries
               WHERE date(date,'+0 days')=substr(date,1,10)
                 AND date(date,'+0 days')>=date(?1 || '-01')
                 AND date(date,'+0 days')<date(?1 || '-01','+1 month')
                 AND (?1<>strftime('%Y-%m','now','localtime') OR date(date,'+0 days')<=date('now','localtime'))
               GROUP BY person_id,date(date,'+0 days')
             )",
            [period], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(DashboardSummary {
            period: period.into(),
            active_students,
            collected_cents,
            payments_collected_cents,
            sales_collected_cents,
            pending_payments,
            overdue_payments,
            registered_sessions,
        })
    }

    pub fn revenue_trend(&self, period: &str, months: i64) -> Result<Vec<RevenuePoint>, String> {
        Self::validate(period, Some(months))?;
        let start = Self::offset_period(period, 1 - months);
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT period,SUM(amount_cents) FROM (
               SELECT substr(paid_at,1,7) AS period,amount_cents FROM payments
               WHERE reversed_at IS NULL AND substr(paid_at,1,7) BETWEEN ?1 AND ?2
               UNION ALL
               SELECT substr(sold_at,1,7) AS period,total_amount_cents FROM sales
               WHERE voided_at IS NULL AND substr(sold_at,1,7) BETWEEN ?1 AND ?2
             ) GROUP BY period",
            )
            .map_err(|e| e.to_string())?;
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

    pub fn inactive_students(
        &self,
        threshold_days: i64,
        page: i64,
        page_size: i64,
    ) -> Result<InactiveStudentsPage, String> {
        if ![7, 10, 14, 21, 30].contains(&threshold_days) {
            return Err("El umbral debe ser 7, 10, 14, 21 o 30 días".into());
        }
        if page < 1 {
            return Err("La página debe ser mayor o igual a 1".into());
        }
        if !(1..=100).contains(&page_size) {
            return Err("El tamaño de página debe estar entre 1 y 100".into());
        }

        let connection = self.connection()?;
        let cte = "WITH latest_sessions AS (
              SELECT person_id, MAX(date(date,'+0 days')) last_session_date
              FROM workout_entries
              WHERE date(date,'+0 days')=substr(date,1,10) AND date(date,'+0 days') <= date('now','localtime')
              GROUP BY person_id
            ), inactive AS (
              SELECT pe.id person_id,
                     trim(pe.name || ' ' || pe.last_name) person_name,
                     ls.last_session_date,
                     CAST(julianday(date('now','localtime')) - julianday(ls.last_session_date) AS INTEGER) days_inactive
              FROM people pe
              JOIN latest_sessions ls ON ls.person_id=pe.id
              WHERE (pe.deleted_at IS NULL OR pe.deleted_at='')
                AND (pe.is_active=1 OR pe.is_active IS NULL)
                AND CAST(julianday(date('now','localtime')) - julianday(ls.last_session_date) AS INTEGER) >= ?1
            )";
        let (total, max_days): (i64, Option<i64>) = connection
            .query_row(
                &format!("{cte} SELECT COUNT(*), MAX(days_inactive) FROM inactive"),
                [threshold_days],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|e| e.to_string())?;
        let total_pages = (total + page_size - 1) / page_size;
        let effective_page = if total_pages > 0 {
            page.min(total_pages)
        } else {
            1
        };
        let offset = (effective_page - 1) * page_size;
        let mut statement = connection
            .prepare(&format!(
                "{cte} SELECT person_id,person_name,last_session_date,days_inactive
                 FROM inactive ORDER BY days_inactive DESC,lower(person_name),person_id
                 LIMIT ?2 OFFSET ?3"
            ))
            .map_err(|e| e.to_string())?;
        let items = statement
            .query_map(params![threshold_days, page_size, offset], |row| {
                Ok(InactiveStudent {
                    person_id: row.get(0)?,
                    person_name: row.get(1)?,
                    last_session_date: row.get(2)?,
                    days_inactive: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        let has_session_data = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM workout_entries WHERE date(date,'+0 days')=substr(date,1,10) AND date(date,'+0 days')<=date('now','localtime'))",
                [],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| e.to_string())? != 0;

        Ok(InactiveStudentsPage {
            inactive_students_count: total,
            max_days_inactive: max_days,
            has_session_data,
            items,
            page: effective_page,
            page_size,
            total_pages,
        })
    }

    pub fn attendance_ranking(
        &self,
        period: &str,
        mode: &str,
        limit: i64,
    ) -> Result<AttendanceRankingResponse, String> {
        Self::validate(period, None)?;
        if !["month", "year", "rolling12"].contains(&mode) {
            return Err("La modalidad debe ser month, year o rolling12".into());
        }
        if !(1..=100).contains(&limit) {
            return Err("El límite debe estar entre 1 y 100".into());
        }
        let connection = self.connection()?;
        let (range_start, range_end_exclusive): (String, String) = connection
            .query_row(
                "SELECT
                   CASE ?2
                     WHEN 'year' THEN substr(?1,1,4) || '-01-01'
                     WHEN 'rolling12' THEN date(?1 || '-01','-11 months')
                     ELSE date(?1 || '-01')
                   END,
                   date(?1 || '-01','+1 month')",
                params![period, mode],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|e| e.to_string())?;
        let mut statement = connection
            .prepare(
                "WITH unique_sessions AS (
                   SELECT person_id,date(date,'+0 days') session_date
                   FROM workout_entries
                   WHERE date(date,'+0 days')=substr(date,1,10)
                     AND date(date,'+0 days')>=date(?1)
                     AND date(date,'+0 days')<date(?2)
                     AND date(date,'+0 days')<=date('now','localtime')
                   GROUP BY person_id,date(date,'+0 days')
                 )
                 SELECT pe.id,trim(pe.name || ' ' || pe.last_name),COUNT(*) sessions_count
                 FROM unique_sessions sessions
                 JOIN people pe ON pe.id=sessions.person_id
                 GROUP BY pe.id,pe.name,pe.last_name
                 ORDER BY sessions_count DESC,lower(trim(pe.name || ' ' || pe.last_name)),pe.id
                 LIMIT ?3",
            )
            .map_err(|e| e.to_string())?;
        let result = statement
            .query_map(params![range_start, range_end_exclusive, limit], |row| {
                Ok(AttendanceRankingEntry {
                    person_id: row.get(0)?,
                    person_name: row.get(1)?,
                    sessions_count: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(AttendanceRankingResponse {
            range_start,
            range_end_exclusive,
            items: result,
        })
    }
}
