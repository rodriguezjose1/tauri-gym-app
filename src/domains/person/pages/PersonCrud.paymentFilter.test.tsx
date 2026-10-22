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
    if (command === 'get_person_by_id') return person;
    if (command === 'get_person_payment_statuses') return [{ person_id: 1, status: 'overdue' }];
    if (command === 'create_person_checked') {
      if (args?.allowDuplicate) return { created: true, duplicates: [] };
      return {
        created: false,
        duplicates: [{ person, is_deleted: false, same_name: true, same_phone: true, similar_name: false }],
      };
    }
    throw new Error(`Comando no previsto: ${command}`);
  });
});

test('la navegación por personId muestra solo esa persona con todas sus acciones', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/personas?personId=1']}><PersonCrud /></MemoryRouter>);

  expect(await screen.findByText('Ana Test')).toBeInTheDocument();
  expect(invoke).toHaveBeenCalledWith('get_person_by_id', { id: 1 });
  expect(screen.getByRole('button', { name: 'Pagos' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Editar/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Eliminar/ })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Ver todas las personas' }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_persons_payment_page', expect.objectContaining({ page: 1 })));
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

test('advierte un posible duplicado y permite reutilizar la persona existente', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><PersonCrud /></MemoryRouter>);

  await user.click(await screen.findByRole('button', { name: 'Nueva Persona' }));
  await user.type(screen.getByLabelText('Nombre'), 'ana');
  await user.type(screen.getByLabelText('Apellido'), 'test');
  await user.type(screen.getByLabelText('Teléfono'), '1');
  await user.click(screen.getByRole('button', { name: 'Crear Persona' }));

  expect(await screen.findByRole('heading', { name: 'Posible persona duplicada' })).toBeInTheDocument();
  expect(screen.getByText('coinciden nombre y teléfono', { exact: false })).toBeInTheDocument();
  expect(invoke).toHaveBeenCalledWith('create_person_checked', {
    person: { name: 'ana', last_name: 'test', phone: '1' },
    allowDuplicate: false,
  });

  await user.click(screen.getByRole('button', { name: 'Usar existente' }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_person_by_id', { id: 1 }));
  expect(screen.queryByRole('heading', { name: 'Posible persona duplicada' })).not.toBeInTheDocument();
});
