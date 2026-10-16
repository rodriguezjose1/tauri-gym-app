import { invoke } from '@tauri-apps/api/core';

export interface DevGeneratedObligation {
  id: number;
  person_id: number;
  person_name: string;
  period: string;
  plan_id: number;
  plan_name: string;
  amount_cents: number;
}

export interface DevGenerationResult {
  items: DevGeneratedObligation[];
  total_amount_cents: number;
}

export const BillingDevService = {
  preview: (through: string) =>
    invoke<DevGenerationResult>('dev_preview_payment_periods', { through }),
  apply: (through: string) =>
    invoke<DevGenerationResult>('dev_apply_payment_periods', { through }),
  rollback: (generatedItems: DevGeneratedObligation[]) =>
    invoke<number>('dev_rollback_payment_periods', { generatedItems }),
};
