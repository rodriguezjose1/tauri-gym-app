import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ExerciseSearch } from './ExerciseSearch';

const exercise = (id: number, name: string) => ({ id, name, code: `E${id}` });
const page = (exercises: ReturnType<typeof exercise>[], current = 1, totalPages = 1) => ({
  exercises,
  total: exercises.length,
  page: current,
  page_size: 20,
  total_pages: totalPages,
});

describe('ExerciseSearch', () => {
  beforeEach(() => global.mockInvoke.mockReset());

  test('carga, selecciona con teclado, cambia grupo y agrega ejercicios', async () => {
    const user = userEvent.setup();
    const onAddExercise = vi.fn().mockResolvedValue(undefined);
    global.mockInvoke.mockResolvedValue(page([exercise(1, 'Sentadilla'), exercise(2, 'Remo')]));
    render(<ExerciseSearch isOpen onAddExercise={onAddExercise} onClose={vi.fn()} />);

    const sentadilla = await screen.findByRole('button', { name: 'Seleccionar ejercicio Sentadilla' });
    fireEvent.keyDown(sentadilla, { key: 'Enter' });
    expect(screen.getByText('Ejercicios seleccionados (1)')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox'), '2');
    await user.click(screen.getByRole('button', { name: '✅ Agregar Ejercicios' }));

    expect(onAddExercise).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 2);
    await waitFor(() => expect(screen.getByText('Selecciona ejercicios para agregar')).toBeInTheDocument());
  });

  test('busca y pagina conservando los resultados anteriores', async () => {
    const user = userEvent.setup();
    global.mockInvoke
      .mockResolvedValueOnce(page([exercise(1, 'Inicial')]))
      .mockResolvedValueOnce(page([exercise(2, 'Press')], 1, 2))
      .mockResolvedValueOnce(page([exercise(3, 'Press inclinado')], 2, 2));
    render(<ExerciseSearch isOpen onAddExercise={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Inicial');

    await user.type(screen.getByLabelText('Buscar ejercicio'), 'press');
    await user.click(screen.getByRole('button', { name: '🔍 Buscar' }));
    expect(await screen.findByText('Press')).toBeInTheDocument();
    expect(global.mockInvoke).toHaveBeenCalledWith('search_exercises_paginated', { query: 'press', page: 1, pageSize: 20 });

    await user.click(screen.getByRole('button', { name: '📄 Cargar más ejercicios' }));
    expect(await screen.findByText('Press inclinado')).toBeInTheDocument();
    expect(screen.getByText('Press')).toBeInTheDocument();
  });

  test('muestra errores de búsqueda sin borrar silenciosamente el estado', async () => {
    const user = userEvent.setup();
    global.mockInvoke.mockResolvedValueOnce(page([exercise(1, 'Sentadilla')])).mockRejectedValueOnce(new Error('offline'));
    render(<ExerciseSearch isOpen onAddExercise={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Sentadilla');
    await user.type(screen.getByLabelText('Buscar ejercicio'), 'fallo');
    await user.click(screen.getByRole('button', { name: '🔍 Buscar' }));

    expect(await screen.findByText('No se pudo realizar la búsqueda')).toBeInTheDocument();
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
  });

  test('bloquea el envío mientras agrega y conserva la selección ante un error', async () => {
    const user = userEvent.setup();
    global.mockInvoke.mockResolvedValue(page([exercise(1, 'Sentadilla')]));
    const onAddExercise = vi.fn().mockRejectedValue(new Error('duplicado'));
    render(<ExerciseSearch isOpen onAddExercise={onAddExercise} onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Seleccionar ejercicio Sentadilla' }));
    await user.click(screen.getByRole('button', { name: '✅ Agregar Ejercicios' }));

    expect(await screen.findByText(/No se pudieron agregar todos/)).toBeInTheDocument();
    expect(screen.getByText('Ejercicios seleccionados (1)')).toBeInTheDocument();
    expect(onAddExercise).toHaveBeenCalledOnce();
  });

  test('cierra limpiando la búsqueda y la selección', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    global.mockInvoke.mockResolvedValue(page([exercise(1, 'Sentadilla')]));
    render(<ExerciseSearch isOpen onAddExercise={vi.fn()} onClose={onClose} />);
    await user.click(await screen.findByRole('button', { name: 'Seleccionar ejercicio Sentadilla' }));
    await user.type(screen.getByLabelText('Buscar ejercicio'), 'texto');
    await user.click(screen.getByRole('button', { name: 'Cerrar búsqueda de ejercicios' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
