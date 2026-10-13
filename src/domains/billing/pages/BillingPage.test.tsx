import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  total: 21,
  page: 1,
  page_size: 20,
  total_pages: 2,
  collected_cents: 10000,
  period_paid_cents: 8000,
  payment_count: 1,
};

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((command: string, args?: { page?: number }) => {
    if (command === 'get_payments_page') return Promise.resolve({ ...page, page: args?.page ?? 1 });
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

test('mantiene el encabezado compacto al volver arriba mientras continúa en Pagos', async () => {
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  const scrollArea = screen.getByTestId('billing-history-scroll');
  const card = scrollArea.closest('.billing-main-card');

  expect(card).not.toHaveClass('is-compact');
  fireEvent.scroll(scrollArea, { target: { scrollTop: 40 } });
  expect(card).toHaveClass('is-compact');
  fireEvent.scroll(scrollArea, { target: { scrollTop: 0 } });
  expect(card).toHaveClass('is-compact');
});

test('mantiene el encabezado compacto al avanzar y retroceder con la paginación', async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  const scrollArea = screen.getByTestId('billing-history-scroll');
  const card = scrollArea.closest('.billing-main-card');
  fireEvent.scroll(scrollArea, { target: { scrollTop: 40 } });
  expect(card).toHaveClass('is-compact');

  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument());
  expect(card).toHaveClass('is-compact');

  await user.click(screen.getByRole('button', { name: 'Anterior' }));
  await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument());
  expect(card).toHaveClass('is-compact');
});

test('restaura el encabezado normal al salir de Pagos y volver a ingresar', async () => {
  const firstVisit = render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  const scrollArea = screen.getByTestId('billing-history-scroll');
  fireEvent.scroll(scrollArea, { target: { scrollTop: 40 } });
  expect(scrollArea.closest('.billing-main-card')).toHaveClass('is-compact');

  firstVisit.unmount();
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  expect(screen.getByTestId('billing-history-scroll').closest('.billing-main-card')).not.toHaveClass('is-compact');
});
