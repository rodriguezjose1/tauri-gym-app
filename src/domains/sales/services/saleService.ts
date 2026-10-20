import { invoke } from '@tauri-apps/api/core';

export type PaymentMethod = 'cash' | 'transfer' | 'other';
export interface SaleRequestItem { product_id: number; quantity: number }
export interface SaleRequest { buyer_person_id?: number; payment_method: PaymentMethod; items: SaleRequestItem[] }
export interface SaleItemResult { product_id: number; product_name: string; quantity: number; unit_price_cents: number; line_total_cents: number; cost_total_cents: number }
export interface SaleSummary { id: number; buyer_name: string | null; products: string; payment_method: PaymentMethod; total_amount_cents: number; total_cost_cents: number; sold_at: string; voided_at: string | null; void_reason: string | null }
export interface SaleResult { id: number; buyer_name: string | null; payment_method: PaymentMethod; total_amount_cents: number; total_cost_cents: number; sold_at: string; voided_at: string | null; void_reason: string | null; items: SaleItemResult[] }
export interface SalePage { sales: SaleSummary[]; total: number; page: number; page_size: number; total_pages: number }

export const SaleService = {
  register: (request: SaleRequest) => invoke<SaleResult>('register_sale', { request }),
  page: (month: string, query: string, status: 'all' | 'active' | 'voided', page: number) => invoke<SalePage>('get_sales_page', { month, query, status, page }),
  detail: (id: number) => invoke<SaleResult>('get_sale_detail', { id }),
  void: (id: number, reason: string) => invoke<void>('void_sale', { id, reason }),
};
