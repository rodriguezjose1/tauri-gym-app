import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, test, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { ToastProvider } from '../../contexts/ToastContext';
import PersonCrud from '../../../domains/person/pages/PersonCrud';
import ExerciseCrud from '../../../domains/exercise/pages/ExerciseCrud';
import { MemoryRouter } from 'react-router-dom';

const person = { id: 1, name: 'Ana', last_name: 'Test', phone: '1' };
const exercise = { id: 1, name: 'Sentadilla', code: 'SENTADILLA' };

beforeEach(() => {
  vi.mocked(invoke).mockReset();
});

describe('paginación compartida en catálogos', () => {
  test('Personas muestra el total del backend, pagina y reemplaza el total al buscar', async () => {
    const user = userEvent.setup();
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === 'count_deleted_people') return 0;
      if (command === 'get_payment_status_counts') return { all: 77, overdue: 8, pending: 12, current: 42, no_plan: 15 };
      if (command === 'get_persons_payment_page') {
        return { persons: [{ ...person, payment_status: 'current' }], total: args?.query ? 1 : 77, page: args?.page, page_size: 10, total_pages: args?.query ? 1 : 8 };
      }
      throw new Error(`Comando no previsto: ${command}`);
    });

    render(<MemoryRouter><PersonCrud /></MemoryRouter>);
    expect(await screen.findByText('77 personas · Página 1 de 8')).toBeInTheDocument();
    expect(screen.queryByText('77 personas total')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('get_persons_payment_page', { query: '', paymentStatus: 'all', page: 2, pageSize: 10 }),
    );

    await user.type(screen.getByPlaceholderText('Buscar personas...'), 'Ana');
    expect(await screen.findByText('1 persona · Página 1 de 1')).toBeInTheDocument();
  });

  test('Ejercicios usa el mismo resumen y conserva el filtro en el paginado', async () => {
    const user = userEvent.setup();
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === 'count_deleted_exercises') return 0;
      if (command === 'get_exercises_paginated') {
        return { exercises: [exercise], total: 23, page: args?.page, page_size: 10, total_pages: 3 };
      }
      if (command === 'search_exercises_paginated') {
        return { exercises: [exercise], total: 12, page: args?.page, page_size: 10, total_pages: 2 };
      }
      throw new Error(`Comando no previsto: ${command}`);
    });

    render(<ToastProvider><ExerciseCrud /></ToastProvider>);
    expect(await screen.findByText('23 ejercicios · Página 1 de 3')).toBeInTheDocument();
    expect(screen.queryByText('23 ejercicios total')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar ejercicios...'), 'Sentadilla');
    expect(await screen.findByText('12 ejercicios · Página 1 de 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('search_exercises_paginated', { query: 'Sentadilla', page: 2, pageSize: 10 }),
    );
  });

  test('Personas eliminadas pagina en backend y retrocede al restaurar el último registro', async () => {
    const user = userEvent.setup();
    let restored = false;
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === 'count_deleted_people') return restored ? 10 : 11;
      if (command === 'get_payment_status_counts') return { all: 20, overdue: 0, pending: 0, current: 20, no_plan: 0 };
      if (command === 'get_persons_payment_page') {
        return { persons: [{ ...person, payment_status: 'current' }], total: 20, page: args?.page, page_size: 10, total_pages: 2 };
      }
      if (command === 'get_deleted_people_paginated') {
        const page = restored ? 1 : args?.page;
        return { persons: [{ ...person, deleted_at: '2026-10-14 15:30:00' }], total: restored ? 10 : 11, page, page_size: 10, total_pages: restored ? 1 : 2 };
      }
      if (command === 'search_deleted_people_paginated') {
        return { persons: [{ ...person, deleted_at: '2026-10-14 15:30:00' }], total: 1, page: 1, page_size: 10, total_pages: 1 };
      }
      if (command === 'restore_person') { restored = true; return; }
      throw new Error(`Comando no previsto: ${command}`);
    });

    render(<MemoryRouter><PersonCrud /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /Personas Eliminadas/ }));
    expect(await screen.findByText('11 personas eliminadas · Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByText(/Eliminada el/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Buscar personas' }), 'Ana Test');
    expect(await screen.findByText('1 persona eliminada · Página 1 de 1')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('search_deleted_people_paginated', { query: 'Ana Test', page: 1, pageSize: 10 });
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(await screen.findByText('11 personas eliminadas · Página 1 de 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('11 personas eliminadas · Página 2 de 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Restaurar/ }));
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(await screen.findByText('10 personas eliminadas · Página 1 de 1')).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith('get_deleted_people');
  });

  test('Ejercicios eliminados solicita solamente la página seleccionada', async () => {
    const user = userEvent.setup();
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command === 'count_deleted_exercises') return 14;
      if (command === 'get_exercises_paginated') {
        return { exercises: [exercise], total: 20, page: args?.page, page_size: 10, total_pages: 2 };
      }
      if (command === 'get_deleted_exercises_paginated') {
        return { exercises: [{ ...exercise, deleted_at: '2026-10-14 15:30:00' }], total: 14, page: args?.page, page_size: 10, total_pages: 2 };
      }
      if (command === 'search_deleted_exercises_paginated') {
        return { exercises: [{ ...exercise, deleted_at: '2026-10-14 15:30:00' }], total: 1, page: 1, page_size: 10, total_pages: 1 };
      }
      throw new Error(`Comando no previsto: ${command}`);
    });

    render(<ToastProvider><ExerciseCrud /></ToastProvider>);
    await user.click(await screen.findByRole('button', { name: /Ejercicios Eliminados/ }));
    expect(await screen.findByText('14 ejercicios eliminados · Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByText(/Eliminado el/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Buscar ejercicios' }), 'SENTADILLA');
    expect(await screen.findByText('1 ejercicio eliminado · Página 1 de 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(await screen.findByText('14 ejercicios eliminados · Página 1 de 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('14 ejercicios eliminados · Página 2 de 2')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('get_deleted_exercises_paginated', { page: 2, pageSize: 10 });
    expect(invoke).not.toHaveBeenCalledWith('get_deleted_exercises');
  });
});
