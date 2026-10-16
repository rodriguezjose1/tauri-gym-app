import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RoutineExercise } from './RoutineExercise';

const exercise = {
  id: 9,
  routine_id: 2,
  exercise_id: 4,
  exercise_name: 'Sentadilla',
  exercise_code: 'SEN',
  order_index: 1,
  group_number: 2,
};

describe('RoutineExercise', () => {
  test('edita el grupo y cierra solamente después de guardar', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<RoutineExercise exercise={exercise} onUpdate={onUpdate} onDelete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Editar/ }));
    await user.selectOptions(screen.getByLabelText('Grupo'), '4');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onUpdate).toHaveBeenCalledWith(9, { group_number: 4 });
    await waitFor(() => expect(screen.getByText('Grupo 2')).toBeInTheDocument());
  });

  test('conserva la edición y muestra un error si falla el guardado', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockRejectedValue(new Error('offline'));
    render(<RoutineExercise exercise={exercise} onUpdate={onUpdate} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No se pudo actualizar el ejercicio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  test('confirma la eliminación y mantiene el diálogo abierto ante un error', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValueOnce(new Error('locked')).mockResolvedValueOnce(undefined);
    render(<RoutineExercise exercise={exercise} onUpdate={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /Eliminar/ }));
    expect(screen.getByText(/eliminar el ejercicio "Sentadilla"/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('No se pudo eliminar el ejercicio')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByText('Confirmar Eliminación')).not.toBeInTheDocument());
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  test('cancelar restaura el grupo original', async () => {
    const user = userEvent.setup();
    render(<RoutineExercise exercise={exercise} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Editar/ }));
    await user.selectOptions(screen.getByLabelText('Grupo'), '5');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: /Editar/ }));
    expect(screen.getByLabelText('Grupo')).toHaveValue('2');
  });
});
