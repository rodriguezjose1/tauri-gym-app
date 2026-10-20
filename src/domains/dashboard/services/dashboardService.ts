import { invoke } from '@tauri-apps/api/core';

export interface DashboardSummary {
  period: string;
  active_students: number;
  collected_cents: number;
  payments_collected_cents: number;
  sales_collected_cents: number;
  pending_payments: number;
  overdue_payments: number;
  registered_sessions: number;
}
export interface RevenuePoint { period: string; amount_cents: number }
export interface StudentPoint { period: string; count: number }
export interface StudentsTrend { available: boolean; points: StudentPoint[] }
export interface PlanDistributionPoint { plan_id: number | null; plan_name: string; count: number }
export interface InactiveStudent { person_id: number; person_name: string; last_session_date: string; days_inactive: number }
export interface InactiveStudentsPage {
  inactive_students_count: number;
  max_days_inactive: number | null;
  has_session_data: boolean;
  items: InactiveStudent[];
  page: number;
  page_size: number;
  total_pages: number;
}
export interface AttendanceRankingEntry { person_id: number; person_name: string; sessions_count: number }
export type AttendanceRankingMode = 'month' | 'year' | 'rolling12';
export interface AttendanceRankingResponse { range_start: string; range_end_exclusive: string; items: AttendanceRankingEntry[] }

export const DashboardService = {
  summary: (period: string) => invoke<DashboardSummary>('get_dashboard_summary', { period }),
  revenueTrend: (period: string, months = 6) => invoke<RevenuePoint[]>('get_dashboard_revenue_trend', { period, months }),
  studentsTrend: (period: string, months = 6) => invoke<StudentsTrend>('get_dashboard_students_trend', { period, months }),
  planDistribution: (period: string) => invoke<PlanDistributionPoint[]>('get_dashboard_plan_distribution', { period }),
  inactiveStudents: (thresholdDays: number, page = 1, pageSize = 10) => invoke<InactiveStudentsPage>('get_dashboard_inactive_students', { thresholdDays, page, pageSize }),
  attendanceRanking: (period: string, mode: AttendanceRankingMode = 'month', limit = 10) => invoke<AttendanceRankingResponse>('get_dashboard_attendance_ranking', { period, mode, limit }),
};
