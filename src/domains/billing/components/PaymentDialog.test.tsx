import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PaymentDialog } from './PaymentDialog';

vi.mock('../../person/components/PersonSearch', async () => {
  const ReactModule = await import('react');
  return {
    PersonSearch: ({ onPersonSelect }: { onPersonSelect: (person: unknown) => void }) =>
      ReactModule.createElement(
        'button',
        { type: 'button', onClick: () => onPersonSelect({ id: 1, name: 'Ana', last_name: 'Test', phone: '1' }) },
        'Seleccionar Ana',
      ),
  };
});

const plans = [
  { id: 1, name: 'X1', modality: 'monthly', price_cents: 32000, is_active: true },
  { id: 2, name: 'X2', modality: 'monthly', price_cents: 28000, is_active: true },
  { id: 3, name: 'Particular', modality: 'particular', price_cents: 9000, is_active: true },
];

const person = { id: 1, name: 'Ana', last_name: 'Test', phone: '1' };

beforeEach(() => {
  global.mockInvoke.mockImplementation((command: string, args?: Record<string, unknown>) => {
    if (command === 'list_plans') return Promise.resolve(plans);
    if (command === 'get_payment_quote') {
      const period = args?.period;
      const planId = args?.planId;
      const amount = planId === 2 ? 27000 : period === '2026-10' ? 30000 : 32000;
      return Promise.resolve({ plan_id: planId ?? 1, amount_cents: amount, already_paid: false });
    }
    return Promise.resolve();
  });
});

test('recalcula el precio histórico al cambiar período y plan', async () => {
  const user = userEvent.setup();
  render(
    <PaymentDialog
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      initial={{ person, period: '2026-10', planId: 1, amountCents: 30000 }}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText('Importe')).toHaveValue(300));
  await user.selectOptions(screen.getByLabelText('Período'), '2026-11');
  await waitFor(() => expect(screen.getByLabelText('Importe')).toHaveValue(320));

  await user.selectOptions(screen.getByLabelText('Plan'), '2');
  await waitFor(() => expect(screen.getByLabelText('Importe')).toHaveValue(270));
  expect(global.mockInvoke).toHaveBeenCalledWith('get_payment_quote', {
    personId: 1,
    period: '2026-11',
    planId: 2,
  });
});

test('respeta el importe persistido de una obligación existente', async () => {
  global.mockInvoke.mockImplementation((command: string, args?: Record<string, unknown>) => {
    if (command === 'list_plans') return Promise.resolve(plans);
    if (command === 'get_payment_quote') {
      return Promise.resolve({
        plan_id: args?.planId ?? 1,
        amount_cents: args?.planId === 2 ? 27000 : 28500,
        already_paid: false,
      });
    }
    return Promise.resolve();
  });

  render(
    <PaymentDialog
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      initial={{ person, period: '2026-10', planId: 1, amountCents: 28500 }}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText('Importe')).toHaveValue(285));
  await userEvent.setup().selectOptions(screen.getByLabelText('Plan'), '2');
  await waitFor(() => expect(screen.getByLabelText('Plan')).toHaveValue('2'));
  expect(screen.getByLabelText('Importe')).toHaveValue(270);
});

test('los pagos particulares usan el precio actual del plan', async () => {
  const user = userEvent.setup();
  render(<PaymentDialog isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Seleccionar Ana' }));
  await user.selectOptions(screen.getByLabelText('Modalidad'), 'particular');

  await waitFor(() => expect(screen.getByLabelText('Plan')).toHaveValue('3'));
  expect(screen.getByLabelText('Importe')).toHaveValue(90);
});

test('una respuesta tardía no sobrescribe un importe ajustado manualmente', async () => {
  let resolveQuote!: (value: unknown) => void;
  const delayedQuote = new Promise((resolve) => { resolveQuote = resolve; });
  global.mockInvoke.mockImplementation((command: string) => {
    if (command === 'list_plans') return Promise.resolve(plans);
    if (command === 'get_payment_quote') return delayedQuote;
    return Promise.resolve();
  });
  const user = userEvent.setup();
  render(
    <PaymentDialog
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      initial={{ person, period: '2026-10', planId: 1, amountCents: 30000 }}
    />,
  );

  await waitFor(() => expect(global.mockInvoke).toHaveBeenCalledWith('get_payment_quote', expect.anything()));
  const amount = screen.getByLabelText('Importe');
  await user.clear(amount);
  await user.type(amount, '275');
  resolveQuote({ plan_id: 1, amount_cents: 30000, already_paid: false });

  await waitFor(() => expect(amount).toHaveValue(275));
});
