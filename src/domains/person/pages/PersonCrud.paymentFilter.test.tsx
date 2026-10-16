import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, test, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import PersonCrud from './PersonCrud';

const person = { id: 1, name: 'Ana', last_name: 'Test', phone: '1', payment_status: 'overdue' };
const counts = { all: 77, overdue: 8, pending: 12, current: 42, no_plan: 15 };

beforeEach(() => {
  vi.mocked(invoke).mockReset();
  vi.mocked(invoke).mockImplementation(async (command, args) => {
    if (command === 'count_deleted_people') return 2;
    if (command === 'get_payment_status_counts') return counts;
    if (command === 'get_persons_payment_page') return { persons: [person], total: args?.paymentStatus === 'all' ? 77 : counts[args?.paymentStatus as keyof typeof counts], page: args?.page, page_size: 10, total_pages: 1 };
    if (command === 'get_deleted_people_paginated') return { persons: [], total: 2, page: 1, page_size: 10, total_pages: 1 };
    throw new Error(`Comando no previsto: ${command}`);
  });
});

test('muestra conteos, combina estado y búsqueda, conserva el filtro al paginar y permite quitarlo', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><PersonCrud /></MemoryRouter>);

  const filter = await screen.findByRole('combobox');
  expect(filter).toHaveValue('all');
  expect(screen.getByRole('option', { name: 'Vencidos (8)' })).toBeInTheDocument();

  await user.selectOptions(filter, 'overdue');
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_persons_payment_page', { query: '', paymentStatus: 'overdue', page: 1, pageSize: 10 }));
  await user.type(screen.getByRole('textbox', { name: 'Buscar personas' }), 'Ana');
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_persons_payment_page', { query: 'Ana', paymentStatus: 'overdue', page: 1, pageSize: 10 }));

  await user.selectOptions(filter, 'all');
  await waitFor(() => expect(filter).toHaveValue('all'));
});

test('oculta el filtro en eliminadas y lo restaura al volver a activas', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><PersonCrud /></MemoryRouter>);
  await user.selectOptions(await screen.findByRole('combobox'), 'pending');
  await user.click(screen.getByRole('button', { name: /Personas Eliminadas/ }));
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Personas Activas/ }));
  expect(await screen.findByRole('combobox')).toHaveValue('pending');
});

test('inicializa un filtro válido desde navegación y descarta uno inválido', async () => {
  const { unmount } = render(<MemoryRouter initialEntries={['/personas?paymentStatus=current']}><PersonCrud /></MemoryRouter>);
  expect(await screen.findByRole('combobox')).toHaveValue('current');
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_persons_payment_page', { query: '', paymentStatus: 'current', page: 1, pageSize: 10 }));
  unmount();

  render(<MemoryRouter initialEntries={['/personas?paymentStatus=invalid']}><PersonCrud /></MemoryRouter>);
  expect(await screen.findByRole('combobox')).toHaveValue('all');
});
