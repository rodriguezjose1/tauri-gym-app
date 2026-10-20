import { invoke } from '@tauri-apps/api/core';

export type PaymentMethod = 'cash' | 'transfer' | 'other';
export interface SaleRequestItem { product_id: number; quantity: number }
export interface SaleRequest { buyer_person_id?: number; payment_method: PaymentMethod; items: SaleRequestItem[] }
export interface SaleItemResult { product_id: number; product_name: string; quantity: number; unit_price_cents: number; line_total_cents: number; cost_total_cents: number }
export interface SaleResult { id: number; buyer_name: string | null; payment_method: PaymentMethod; total_amount_cents: number; total_cost_cents: number; sold_at: string; items: SaleItemResult[] }

export const SaleService = {
  register: (request: SaleRequest) => invoke<SaleResult>('register_sale', { request }),
};
