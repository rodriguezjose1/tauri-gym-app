import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import BillingPage from './BillingPage';
import { ToastProvider } from '../../../shared/contexts/ToastContext';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

const page = {
  payments: [
    {
      id: 1,
      person_id: 1,
      person_name: 'Ana Test',
      plan_id: 1,
      plan_name: 'Mensual',
      modality: 'monthly',
      period: '2026-10',
      amount_cents: 10000,
      paid_at: '2026-10-10 10:00:00',
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
  collected_cents: 10000,
  period_paid_cents: 8000,
  payment_count: 1,
};

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((command: string) => {
    if (command === 'get_payments_page') return Promise.resolve(page);
    if (command === 'reverse_payment') return Promise.resolve();
    return Promise.resolve([]);
  });
});

test('muestra las métricas independientes del mes y del período', async () => {
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  const collectedMetric = screen.getByText('Recaudado en el mes').closest('.billing-metric');
  const periodMetric = screen.getByText('Pagado del período').closest('.billing-metric');

  expect(collectedMetric).toHaveTextContent('$ 100,00');
  expect(periodMetric).toHaveTextContent('$ 80,00');
  expect(screen.getByText('Pagos registrados en el mes')).toBeInTheDocument();
});

test('muestra pantalla informativa y revierte con confirmación y motivo', async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(screen.getByRole('heading', { name: 'Pagos' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Alumno')).not.toBeInTheDocument();
  expect(await screen.findByText('Ana Test')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Revertir' }));
  await user.type(screen.getByLabelText('Motivo'), 'Carga incorrecta');
  await user.click(screen.getByRole('button', { name: 'Confirmar reversión' }));

  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('reverse_payment', {
      id: 1,
      reason: 'Carga incorrecta',
    }),
  );
  await waitFor(() =>
    expect(invoke.mock.calls.filter(([command]) => command === 'get_payments_page')).toHaveLength(2),
  );
});
