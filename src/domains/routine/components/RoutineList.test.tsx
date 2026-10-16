import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RoutineList } from './RoutineList';

describe('RoutineList', () => {
  test('distingue carga y lista vacía', () => {
    const props = { routines: [], selectedRoutineId: null, onSelectRoutine: vi.fn(), onDeleteRoutine: vi.fn() };
    const { rerender } = render(<RoutineList {...props} loading />);
    expect(screen.getByText('Cargando rutinas...')).toBeInTheDocument();
    rerender(<RoutineList {...props} loading={false} />);
    expect(screen.getByText('No hay rutinas disponibles')).toBeInTheDocument();
  });

  test('selecciona con mouse y teclado e identifica la selección actual', async () => {
    const user = userEvent.setup();
    const onSelectRoutine = vi.fn();
    render(
      <RoutineList
        routines={[{ id: 1, name: 'Fuerza', code: 'FZA' }, { id: 2, name: 'Movilidad', code: 'MOV' }]}
        selectedRoutineId={1}
        loading={false}
        onSelectRoutine={onSelectRoutine}
        onDeleteRoutine={vi.fn()}
      />,
    );

    const fuerza = screen.getByRole('button', { name: 'Seleccionar rutina Fuerza' });
    const movilidad = screen.getByRole('button', { name: 'Seleccionar rutina Movilidad' });
    expect(fuerza).toHaveAttribute('aria-pressed', 'true');
    await user.click(movilidad);
    fireEvent.keyDown(fuerza, { key: 'Enter' });
    fireEvent.keyDown(movilidad, { key: ' ' });
    expect(onSelectRoutine.mock.calls).toEqual([[2], [1], [2]]);
  });

  test('elimina sin seleccionar accidentalmente la rutina', async () => {
    const user = userEvent.setup();
    const onSelectRoutine = vi.fn();
    const onDeleteRoutine = vi.fn();
    render(
      <RoutineList
        routines={[{ id: 3, name: 'Resistencia', code: 'RES' }]}
        selectedRoutineId={null}
        loading={false}
        onSelectRoutine={onSelectRoutine}
        onDeleteRoutine={onDeleteRoutine}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar rutina Resistencia' }));
    expect(onDeleteRoutine).toHaveBeenCalledWith(3, 'Resistencia');
    expect(onSelectRoutine).not.toHaveBeenCalled();
  });
});
