import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { ToastProvider } from '../../../shared/contexts/ToastContext';
import { PersonPaymentProfile } from './PersonPaymentProfile';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

beforeEach(() => {
  invoke.mockImplementation((command: string) => {
    if (command === 'get_person_payment_history') return Promise.resolve({
      items: [{ item_type: 'monthly', obligation_id: 8, period: '2026-11', plan_id: 2, plan_name: 'Mensual', amount_cents: 40000, status: 'overdue' }],
      total: 1, page: 1, page_size: 20, total_pages: 1,
    });
    if (command === 'set_payment_period_excluded') return Promise.resolve();
    return Promise.resolve([]);
  });
});

test('permite excluir un período vencido desde el historial del alumno', async () => {
  const user = userEvent.setup();
  render(<ToastProvider><PersonPaymentProfile person={{ id: 1, name: 'Ana', last_name: 'Test', phone: '1' }} onClose={vi.fn()} onChanged={vi.fn()} /></ToastProvider>);
  expect(await screen.findByText('Vencido')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'No corresponde' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar' }));
  expect(invoke).toHaveBeenCalledWith('set_payment_period_excluded', { obligationId: 8, excluded: true });
});

test('mantiene el encabezado descriptivo fuera del scroll de la tabla', async () => {
  render(<ToastProvider><PersonPaymentProfile person={{ id: 1, name: 'Ana', last_name: 'Test', phone: '1' }} onClose={vi.fn()} onChanged={vi.fn()} /></ToastProvider>);

  const historyTitle = screen.getByRole('heading', { name: 'Historial de pagos' });
  const table = await screen.findByRole('table');
  const scrollArea = table.closest('.person-payment-profile-scroll');

  expect(scrollArea).not.toBeNull();
  expect(scrollArea).not.toContainElement(historyTitle);
  expect(historyTitle.closest('.person-payment-profile-heading')).not.toBeNull();
});

test('ofrece registrar el primer pago sin salir del historial y conserva la persona', async () => {
  invoke.mockImplementation((command: string) => {
    if (command === 'get_person_payment_history') return Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    if (command === 'list_plans') return Promise.resolve([]);
    if (command === 'get_payment_quote') return Promise.resolve({ plan_id: null, amount_cents: null, already_paid: false });
    return Promise.resolve();
  });
  const user = userEvent.setup();
  render(<ToastProvider><PersonPaymentProfile person={{ id: 1, name: 'Ana', last_name: 'Test', phone: '1' }} onClose={vi.fn()} onChanged={vi.fn()} /></ToastProvider>);

  await user.click(await screen.findByRole('button', { name: 'Registrar pago' }));
  expect(screen.getByRole('heading', { name: 'Registrar pago' })).toBeInTheDocument();
  expect(invoke).toHaveBeenCalledWith('get_payment_quote', expect.objectContaining({ personId: 1 }));
});
