import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRoutineExercises } from './useRoutineExercises';

const addNotification = vi.fn();
const exercise = {
  id: 9,
  routine_id: 3,
  exercise_id: 4,
  exercise_name: 'Sentadilla',
  exercise_code: 'SEN',
  order_index: 1,
  sets: 4,
  reps: 8,
  weight: 50,
  notes: 'Anterior',
  group_number: 2,
};

vi.mock('../../../shared/contexts/ToastContext', () => ({
  useToast: () => ({ addNotification }),
}));

describe('useRoutineExercises', () => {
  beforeEach(() => addNotification.mockClear());

  test('carga y agrega ejercicios, refrescando la rutina', async () => {
    global.mockInvoke
      .mockResolvedValueOnce([exercise])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([exercise]);
    const { result } = renderHook(() => useRoutineExercises({ routineId: 3 }));

    await act(async () => result.current.loadExercises());
    expect(result.current.exercises).toEqual([exercise]);
    await act(async () => result.current.addExercise(4, 1, 3, 10, 20, 'Nota', 1));

    expect(global.mockInvoke).toHaveBeenCalledWith('add_exercise_to_routine', {
      routineId: 3, exerciseId: 4, orderIndex: 1, sets: 3, reps: 10, weight: 20, notes: 'Nota', groupNumber: 1,
    });
    expect(addNotification).toHaveBeenCalledWith(expect.any(String), 'success');
  });

  test('permite guardar peso cero y borrar las notas al editar', async () => {
    global.mockInvoke
      .mockResolvedValueOnce([exercise])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([exercise]);
    const { result } = renderHook(() => useRoutineExercises({ routineId: 3 }));
    await act(async () => result.current.loadExercises());

    await act(async () => result.current.updateExercise(9, 1, 4, 8, 0, '', 2));

    expect(global.mockInvoke).toHaveBeenCalledWith('update_routine_exercise', expect.objectContaining({
      id: 9, weight: 0, notes: '',
    }));
    expect(global.mockInvoke).toHaveBeenCalledWith('renumber_routine_groups', { routineId: 3 });
  });

  test('elimina por exercise_id, renumera y vuelve a cargar', async () => {
    global.mockInvoke
      .mockResolvedValueOnce([exercise])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);
    const { result } = renderHook(() => useRoutineExercises({ routineId: 3 }));
    await act(async () => result.current.loadExercises());
    await act(async () => result.current.removeExercise(9));

    expect(global.mockInvoke).toHaveBeenCalledWith('remove_exercise_from_routine', { routineId: 3, exerciseId: 4 });
    expect(result.current.exercises).toEqual([]);
  });

  test('propaga un error de grupo y no anuncia éxito', async () => {
    global.mockInvoke.mockRejectedValue('⚠️ No puedes saltar grupos');
    const { result } = renderHook(() => useRoutineExercises({ routineId: 3 }));

    await act(async () => expect(result.current.addExercise(4, 1)).rejects.toThrow('No puedes saltar grupos'));
    expect(addNotification).toHaveBeenCalledWith(expect.stringContaining('No puedes saltar grupos'), 'error', 10000);
    expect(result.current.loading).toBe(false);
  });
});
