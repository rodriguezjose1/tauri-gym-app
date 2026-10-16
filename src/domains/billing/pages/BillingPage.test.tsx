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

test('prioriza el historial y no duplica las métricas del Dashboard', async () => {
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  expect(screen.queryByText('Recaudado en el mes')).not.toBeInTheDocument();
  expect(screen.queryByText('Pagado del período')).not.toBeInTheDocument();
  expect(screen.queryByText('Pagos registrados en el mes')).not.toBeInTheDocument();
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

test('mantiene período y registro de pago en un encabezado fijo y compacto', async () => {
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  const header = screen.getByRole('heading', { name: 'Pagos' }).closest('.management-page-header');
  expect(header).toContainElement(screen.getByRole('combobox'));
  expect(header).toContainElement(screen.getByRole('button', { name: 'Registrar pago' }));
  expect(screen.getByTestId('billing-history-scroll').closest('.billing-main-card')).not.toHaveClass('is-compact');
});

test('busca por persona, conserva el filtro al paginar y permite limpiarlo', async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Buscar pagos por persona' }), 'Ana');
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('get_payments_page', {
      month: '2026-10',
      personQuery: 'Ana',
      page: 1,
      pageSize: 20,
    }),
  );

  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('get_payments_page', {
      month: '2026-10',
      personQuery: 'Ana',
      page: 2,
      pageSize: 20,
    }),
  );

  await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
  expect(screen.getByRole('textbox', { name: 'Buscar pagos por persona' })).toHaveValue('');
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith('get_payments_page', {
      month: '2026-10',
      personQuery: '',
      page: 1,
      pageSize: 20,
    }),
  );
});

test('abre Registrar pago con Ctrl+P y no intercepta el atajo mientras se escribe', async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <BillingPage />
    </ToastProvider>,
  );

  await screen.findByText('Ana Test');
  const search = screen.getByRole('textbox', { name: 'Buscar pagos por persona' });
  search.focus();
  await user.keyboard('{Control>}p{/Control}');
  expect(screen.queryByRole('heading', { name: 'Registrar pago' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('heading', { name: 'Pagos' }));
  await user.keyboard('{Control>}p{/Control}');
  expect(screen.getByRole('heading', { name: 'Registrar pago' })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('🔍 Buscar persona...')).toHaveFocus();

  await user.keyboard('{Control>}p{/Control}');
  expect(screen.getAllByRole('heading', { name: 'Registrar pago' })).toHaveLength(1);
});
