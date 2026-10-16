import { invoke } from '@tauri-apps/api/core';

export interface DashboardSummary {
  period: string;
  active_students: number;
  collected_cents: number;
  pending_payments: number;
  overdue_payments: number;
  registered_sessions: number;
}
export interface RevenuePoint { period: string; amount_cents: number }
export interface StudentPoint { period: string; count: number }
export interface StudentsTrend { available: boolean; points: StudentPoint[] }
export interface PlanDistributionPoint { plan_id: number | null; plan_name: string; count: number }

export const DashboardService = {
  summary: (period: string) => invoke<DashboardSummary>('get_dashboard_summary', { period }),
  revenueTrend: (period: string, months = 6) => invoke<RevenuePoint[]>('get_dashboard_revenue_trend', { period, months }),
  studentsTrend: (period: string, months = 6) => invoke<StudentsTrend>('get_dashboard_students_trend', { period, months }),
  planDistribution: (period: string) => invoke<PlanDistributionPoint[]>('get_dashboard_plan_distribution', { period }),
};
