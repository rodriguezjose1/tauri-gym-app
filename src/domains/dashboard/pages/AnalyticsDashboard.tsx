import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, ErrorMessage, Pagination, Select, Title } from '../../../shared/components/base';
import { ManagementPageHeader } from '../../../shared/components/management';
import { PeriodSelect } from '../../billing/components/PeriodSelect';
import { currentPeriod } from '../../billing/utils/periodOptions';
import { DashboardService, type DashboardSummary, type InactiveStudentsPage, type PlanDistributionPoint, type RevenuePoint, type StudentsTrend } from '../services/dashboardService';
import '../../../styles/AnalyticsDashboard.css';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-AR');
const monthLabel = (period: string) => new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(new Date(`${period}-02T12:00:00`)).replace('.', '');
const monthYearLabel = (period: string) => new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(`${period}-02T12:00:00`));
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-AR').format(new Date(`${date}T12:00:00`));
const INACTIVE_THRESHOLDS = [7, 10, 14, 21, 30];
const INACTIVE_PAGE_SIZE = 8;

function StatCard({ label, value, hint, onClick, attention = false }: { label: string; value: string; hint?: string; onClick?: () => void; attention?: boolean }) {
  const content = <><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</>;
  const className = `analytics-stat${attention ? ' analytics-stat--attention' : ''}`;
  return onClick
    ? <button className={className} onClick={onClick} type="button">{content}</button>
    : <div className={className}>{content}</div>;
}

function ChartCard({ title, error, loading, children }: React.PropsWithChildren<{ title: string; error?: string; loading: boolean }>) {
  return <Card variant="default" padding="md" className="analytics-chart-card"><Title level={3}>{title}</Title>{loading ? <div className="analytics-state">Cargando…</div> : error ? <ErrorMessage message={error} /> : children}</Card>;
}

function Bars({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(1, ...points.map(point => point.amount_cents));
  return <div className="analytics-bars" role="img" aria-label="Evolución de recaudación">{points.map(point => <div className="analytics-bar-column analytics-tooltip-target" key={point.period} tabIndex={0} data-tooltip={`${monthYearLabel(point.period)} · ${money.format(point.amount_cents / 100)}`} aria-label={`${monthYearLabel(point.period)}: ${money.format(point.amount_cents / 100)}`}><div className="analytics-bar" style={{ height: `${Math.max(point.amount_cents ? 8 : 2, point.amount_cents / max * 100)}%` }} /><span>{monthLabel(point.period)}</span></div>)}</div>;
}

function Line({ trend }: { trend: StudentsTrend }) {
  if (!trend.available) return <div className="analytics-state">No hay información histórica suficiente.</div>;
  const max = Math.max(1, ...trend.points.map(point => point.count));
  const coordinates = trend.points.map((point, index) => `${trend.points.length === 1 ? 50 : index * 100 / (trend.points.length - 1)},${92 - point.count / max * 78}`).join(' ');
  return <div className="analytics-line"><div className="analytics-line-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Evolución de alumnos activos"><polyline points={coordinates} /></svg>{trend.points.map((point, index) => <button type="button" className="analytics-line-hit analytics-tooltip-target" key={point.period} style={{ left: `${trend.points.length === 1 ? 50 : index * 100 / (trend.points.length - 1)}%`, '--point-y': `${92 - point.count / max * 78}%` } as React.CSSProperties} data-tooltip={number.format(point.count)} aria-label={`${monthYearLabel(point.period)}: ${point.count} alumnos`} />)}</div><div>{trend.points.map(point => <span key={point.period}>{monthLabel(point.period)}</span>)}</div></div>;
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(currentPeriod());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [students, setStudents] = useState<StudentsTrend | null>(null);
  const [plans, setPlans] = useState<PlanDistributionPoint[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({ summary: true, revenue: true, students: true, plans: true });
  const requestId = useRef(0);
  const inactiveRequestId = useRef(0);
  const [inactiveThreshold, setInactiveThreshold] = useState(7);
  const [inactivePage, setInactivePage] = useState(1);
  const [inactiveData, setInactiveData] = useState<InactiveStudentsPage | null>(null);
  const [inactiveLoading, setInactiveLoading] = useState(true);
  const [inactiveError, setInactiveError] = useState('');
  const [inactiveRetry, setInactiveRetry] = useState(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading({ summary: true, revenue: true, students: true, plans: true }); setErrors({});
    const load = async <T,>(key: string, promise: Promise<T>, apply: (value: T) => void) => {
      try { const value = await promise; if (id === requestId.current) apply(value); }
      catch (error) { if (id === requestId.current) setErrors(previous => ({ ...previous, [key]: String(error) })); }
      finally { if (id === requestId.current) setLoading(previous => ({ ...previous, [key]: false })); }
    };
    void load('summary', DashboardService.summary(period), setSummary);
    void load('revenue', DashboardService.revenueTrend(period), setRevenue);
    void load('students', DashboardService.studentsTrend(period), setStudents);
    void load('plans', DashboardService.planDistribution(period), setPlans);
  }, [period]);

  useEffect(() => {
    const id = ++inactiveRequestId.current;
    setInactiveLoading(true);
    setInactiveError('');
    void DashboardService.inactiveStudents(inactiveThreshold, inactivePage, INACTIVE_PAGE_SIZE)
      .then(value => { if (id === inactiveRequestId.current) setInactiveData(value); })
      .catch(error => { if (id === inactiveRequestId.current) setInactiveError(String(error)); })
      .finally(() => { if (id === inactiveRequestId.current) setInactiveLoading(false); });
  }, [inactiveThreshold, inactivePage, inactiveRetry]);

  const maxPlan = Math.max(1, ...plans.map(plan => plan.count));
  return <div className="analytics-page management-page-frame"><Card variant="elevated" padding="md" className="management-page-card analytics-main">
    <div className="analytics-header"><ManagementPageHeader title="Dashboard" /><PeriodSelect value={period} onChange={value => setPeriod(String(value))} /></div>
    {errors.summary ? <ErrorMessage message={errors.summary} /> : <div className="analytics-stats">
      <StatCard label="Alumnos activos" value={loading.summary ? '—' : number.format(summary?.active_students ?? 0)} onClick={() => navigate('/personas')} hint="Ver alumnos activos" />
      <StatCard label="Recaudación mensual" value={loading.summary ? '—' : money.format((summary?.collected_cents ?? 0) / 100)} onClick={() => navigate(`/pagos?period=${period}`)} hint="Ver pagos" />
      <StatCard label="Pagos pendientes" value={loading.summary ? '—' : number.format(summary?.pending_payments ?? 0)} onClick={() => navigate(`/personas?paymentStatus=pending&period=${period}`)} hint="Ver pendientes" />
      <StatCard label="Pagos vencidos" value={loading.summary ? '—' : number.format(summary?.overdue_payments ?? 0)} onClick={() => navigate(`/personas?paymentStatus=overdue&period=${period}`)} hint="Ver vencidos" attention={!loading.summary && (summary?.overdue_payments ?? 0) > 0} />
      <StatCard label="Sesiones registradas" value={loading.summary ? '—' : number.format(summary?.registered_sessions ?? 0)} />
    </div>}
    <div className="analytics-grid">
      <ChartCard title="Evolución de recaudación" loading={loading.revenue} error={errors.revenue}>{revenue.length ? <Bars points={revenue} /> : <div className="analytics-state">Sin movimientos en el período.</div>}</ChartCard>
      <ChartCard title="Evolución de alumnos activos" loading={loading.students} error={errors.students}>{students && <Line trend={students} />}</ChartCard>
      <ChartCard title="Distribución por plan" loading={loading.plans} error={errors.plans}><div className="analytics-plan-list">{plans.length ? plans.map(plan => <div key={plan.plan_id ?? 'none'} title={`${plan.plan_name}: ${plan.count}`}><span>{plan.plan_name}</span><div><i style={{ width: `${plan.count / maxPlan * 100}%` }} /></div><strong>{plan.count}</strong></div>) : <div className="analytics-state">No hay alumnos activos para distribuir.</div>}</div></ChartCard>
    </div>
    <Card variant="default" padding="md" className="analytics-inactive">
      <div className="analytics-inactive-header">
        <div><Title level={3}>Alumnos sin asistir</Title><p>Según la última sesión registrada hasta hoy.</p></div>
        <Select label="Días sin asistir" size="sm" value={inactiveThreshold} options={INACTIVE_THRESHOLDS.map(days => ({ value: days, label: `${days} días` }))} onChange={value => { setInactiveThreshold(Number(value)); setInactivePage(1); }} />
      </div>
      {inactiveLoading && !inactiveData ? <div className="analytics-inactive-state">Cargando alumnos…</div> : inactiveError ? <div className="analytics-inactive-state"><ErrorMessage message={inactiveError} /><Button size="sm" variant="secondary" onClick={() => setInactiveRetry(value => value + 1)}>Reintentar</Button></div> : inactiveData && <>
        <div className="analytics-inactive-summary" aria-label="Resumen de alumnos sin asistir">
          <div><span>Alumnos sin asistir</span><strong>{number.format(inactiveData.inactive_students_count)}</strong></div>
          <div><span>Mayor inactividad</span><strong>{inactiveData.max_days_inactive == null ? '—' : `${number.format(inactiveData.max_days_inactive)} días`}</strong></div>
        </div>
        {inactiveData.items.length ? <>
          <div className="analytics-inactive-table-wrap"><table className="analytics-inactive-table"><thead><tr><th>Alumno</th><th>Última sesión</th><th>Días sin asistir</th></tr></thead><tbody>{inactiveData.items.map(student => <tr key={student.person_id}><td><button type="button" onClick={() => navigate(`/personas?personId=${student.person_id}`)}>{student.person_name}</button></td><td>{dateLabel(student.last_session_date)}</td><td><strong>{number.format(student.days_inactive)}</strong></td></tr>)}</tbody></table></div>
          <Pagination total={inactiveData.inactive_students_count} page={inactiveData.page} totalPages={inactiveData.total_pages} singularLabel="alumno" pluralLabel="alumnos" loading={inactiveLoading} onPageChange={setInactivePage} />
        </> : <div className="analytics-inactive-state">{inactiveData.has_session_data ? `No hay alumnos con ${inactiveThreshold} días o más sin asistir.` : 'Todavía no hay sesiones registradas para calcular la inactividad.'}</div>}
      </>}
    </Card>
  </Card></div>;
}
