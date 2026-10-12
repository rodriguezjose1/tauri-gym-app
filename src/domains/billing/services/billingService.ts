import { invoke } from '@tauri-apps/api/core';
export type Modality='monthly'|'particular';
export interface Plan{id?:number;name:string;modality:Modality;price_cents:number;is_active:boolean}
export interface Obligation{id:number;person_id:number;period:string;plan_id:number;amount_cents:number;paid:boolean}
export interface Payment{id:number;person_id:number;person_name:string;obligation_id?:number;plan_id:number;plan_name:string;modality:Modality;period?:string;amount_cents:number;paid_at:string;reversed_at?:string;reversal_reason?:string}
export interface PaymentPage{payments:Payment[];total:number;page:number;page_size:number;total_pages:number;collected_cents:number;payment_count:number}
export interface PaymentQuote{plan_id:number|null;amount_cents:number|null;already_paid:boolean}
export const BillingService={
  plans:(activeOnly=false)=>invoke<Plan[]>('list_plans',{activeOnly}),
  savePlan:(plan:Plan)=>invoke<Plan>('save_plan',{plan}),
  obligation:(personId:number,period:string)=>invoke<Obligation>('ensure_obligation',{personId,period}),
  pay:(request:{person_id:number;modality:Modality;period?:string;plan_id:number;amount_cents:number})=>invoke<Payment>('record_payment',{request}),
  payments:()=>invoke<Payment[]>('list_payments'),
  paymentsPage:(month:string,page:number,pageSize=20)=>invoke<PaymentPage>('get_payments_page',{month,page,pageSize}),
  quote:(personId:number,period:string)=>invoke<PaymentQuote>('get_payment_quote',{personId,period}),
  reverse:(id:number,reason:string)=>invoke<void>('reverse_payment',{id,reason})
};
