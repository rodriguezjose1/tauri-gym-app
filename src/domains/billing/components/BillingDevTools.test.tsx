import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, vi } from 'vitest';
import { ToastProvider } from '../../../shared/contexts/ToastContext';
import { BillingDevTools } from './BillingDevTools';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

const result = {
  items: [{ id: 81, person_id: 1, person_name: 'Ana Test', period: '2026-11', plan_id: 2, plan_name: 'Mensual', amount_cents: 40000 }],
  total_amount_cents: 40000,
};

beforeEach(() => {
  window.localStorage.clear();
  invoke.mockReset();
  invoke.mockImplementation((command: string) => {
    if (command === 'dev_rollback_payment_periods') return Promise.resolve(1);
    return Promise.resolve(result);
  });
});

test('previsualiza, aplica y revierte una generación identificada', async () => {
  const user = userEvent.setup();
  render(<ToastProvider><BillingDevTools /></ToastProvider>);

  await user.click(screen.getByRole('button', { name: 'Previsualizar' }));
  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  expect(screen.getByText('1 obligaciones nuevas')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Generar para prueba' }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('dev_apply_payment_periods', expect.any(Object)));
  expect(await screen.findByRole('button', { name: 'Revertir generación' })).toBeInTheDocument();
  expect(window.localStorage.setItem).toHaveBeenCalledWith(
    'quality-gym:dev-billing-generation',
    expect.stringContaining('81'),
  );

  await user.click(screen.getByRole('button', { name: 'Revertir generación' }));
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('dev_rollback_payment_periods', { generatedItems: result.items }),
  );
  expect(window.localStorage.removeItem).toHaveBeenCalledWith('quality-gym:dev-billing-generation');
});
