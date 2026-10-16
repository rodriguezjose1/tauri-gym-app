import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useWorkoutOperations } from './useWorkoutOperations';

const person = { id: 1, name: 'Ana', last_name: 'Test', phone: '1' };
const entry = { id: 10, person_id: 1, exercise_id: 2, date: '2026-10-10', sets: 3, reps: 10, weight: 20, notes: '' };

describe('useWorkoutOperations', () => {
  const refresh = vi.fn().mockResolvedValue(undefined);
  const toast = vi.fn();

  beforeEach(() => {
    refresh.mockClear();
    toast.mockClear();
    global.mockInvoke.mockResolvedValue(undefined);
  });

  const setup = (selectedPerson = person, workoutData = [entry]) => renderHook(() => useWorkoutOperations({ selectedPerson, workoutData, refreshWorkoutData: refresh, showToast: toast }));

  test('crea y actualiza ejercicios, refrescando los datos', async () => {
    const { result } = setup();
    await act(async () => expect(await result.current.saveWorkoutEntry(entry)).toBe(true));
    expect(global.mockInvoke).toHaveBeenCalledWith('create_workout_entry', { workoutEntry: entry });
    await act(async () => expect(await result.current.updateWorkoutEntry(entry)).toBe(true));
    expect(global.mockInvoke).toHaveBeenCalledWith('update_workout_entry', { workoutEntry: entry });
    expect(refresh).toHaveBeenCalledWith(1);
  });

  test('rechaza datos incompletos sin invocar el backend', async () => {
    const { result } = setup(null);
    await act(async () => expect(await result.current.saveWorkoutEntry(entry)).toBe(false));
    await act(async () => expect(await result.current.updateWorkoutEntry(entry)).toBe(false));
    expect(global.mockInvoke).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  test('guarda una sesión y elimina renumerando el día afectado', async () => {
    global.mockInvoke.mockImplementation((command: string) => command === 'get_workout_entries_by_person_and_date_range' ? Promise.resolve([]) : Promise.resolve());
    const { result } = setup();
    await act(async () => expect(await result.current.saveWorkoutSession([entry])).toBe(true));
    expect(global.mockInvoke).toHaveBeenCalledWith('create_batch', { workoutEntries: [expect.objectContaining({ person_id: 1, exercise_id: 2, date: '2026-10-10' })] });
    await act(async () => expect(await result.current.deleteWorkoutEntry(10)).toBe(true));
    expect(global.mockInvoke).toHaveBeenCalledWith('delete_workout_entry', { id: 10 });
    expect(global.mockInvoke).toHaveBeenCalledWith('renumber_workout_groups', { personId: 1, date: '2026-10-10' });
  });

  test('informa el mensaje de grupos y recupera el estado tras un error', async () => {
    global.mockInvoke.mockRejectedValueOnce('⚠️ No puedes saltar grupos');
    const { result } = setup();
    await act(async () => expect(await result.current.updateWorkoutEntry(entry)).toBe(false));
    expect(toast).toHaveBeenCalledWith('⚠️ No puedes saltar grupos', 'error');
    expect(result.current.savingEdit).toBe(false);
  });
});
