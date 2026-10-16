import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PlanDialog } from './PlanDialog';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

const monthlyPlan = {
  id: 1,
  name: 'Mensual',
  modality: 'monthly' as const,
  price_cents: 40000,
  is_active: true,
};

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue(monthlyPlan);
});

test('selecciona próximo mes por defecto cuando cambia un precio mensual', async () => {
  const user = userEvent.setup();
  render(<PlanDialog isOpen plan={monthlyPlan} onClose={vi.fn()} onSaved={vi.fn()} />);

  const price = screen.getByLabelText('Precio');
  await user.clear(price);
  await user.type(price, '450');

  expect(screen.getByText(/Precio anterior:/)).toBeInTheDocument();
  expect(screen.getByText(/Precio nuevo:/)).toBeInTheDocument();
  expect(screen.getByLabelText('Aplicar desde')).toHaveValue('next');
  expect(screen.getByText(/El mes actual conserva su precio/)).toBeInTheDocument();
});

test('editar solamente el nombre no muestra opciones de vigencia', async () => {
  const user = userEvent.setup();
  render(<PlanDialog isOpen plan={monthlyPlan} onClose={vi.fn()} onSaved={vi.fn()} />);

  await user.clear(screen.getByLabelText('Nombre'));
  await user.type(screen.getByLabelText('Nombre'), 'Mensual actualizado');

  expect(screen.queryByLabelText('Aplicar desde')).not.toBeInTheDocument();
});

test('un plan particular cambia de precio sin solicitar vigencia', async () => {
  const user = userEvent.setup();
  const particular = { ...monthlyPlan, modality: 'particular' as const };
  render(<PlanDialog isOpen plan={particular} onClose={vi.fn()} onSaved={vi.fn()} />);

  await user.clear(screen.getByLabelText('Precio'));
  await user.type(screen.getByLabelText('Precio'), '450');

  expect(screen.queryByLabelText('Aplicar desde')).not.toBeInTheDocument();
});
