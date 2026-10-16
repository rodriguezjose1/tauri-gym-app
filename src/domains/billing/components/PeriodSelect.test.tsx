import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { PeriodSelect } from './PeriodSelect';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-16T12:00:00-03:00'));
});

afterEach(() => vi.useRealTimers());

test('muestra siete meses, identifica el actual y amplía solamente bajo demanda', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<PeriodSelect value="2026-10" onChange={vi.fn()} />);

  expect(screen.getAllByRole('option')).toHaveLength(8);
  expect(screen.getByRole('option', { name: 'octubre de 2026 — Actual' })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Período'), '__more_periods__');
  expect(screen.getAllByRole('option')).toHaveLength(37);
  expect(screen.queryByRole('option', { name: 'Ver más períodos…' })).not.toBeInTheDocument();
});

test('conserva visible un período seleccionado fuera de la ventana compacta', () => {
  render(<PeriodSelect value="2025-01" onChange={vi.fn()} />);
  expect(screen.getByRole('option', { name: 'enero de 2025' })).toBeInTheDocument();
  expect(screen.getByLabelText('Período')).toHaveValue('2025-01');
});
