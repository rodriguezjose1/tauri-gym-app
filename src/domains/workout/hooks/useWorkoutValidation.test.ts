import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useWorkoutValidation } from './useWorkoutValidation';

const person = { id: 1, name: 'Ana', last_name: 'Test', phone: '1' };
const form = { exercise_id: 2, sets: 3, reps: 10, weight: 20, notes: '' };

describe('useWorkoutValidation', () => {
  test('valida persona, fecha y ejercicio y comunica cada ausencia', () => {
    const showToast = vi.fn();
    const { result } = renderHook(() => useWorkoutValidation({ showToast }));

    expect(result.current.validatePersonAndDate(person, '2026-10-10')).toBe(true);
    expect(result.current.validatePersonAndDate(null, '')).toBe(false);
    expect(result.current.validateWorkoutEntry(person, '2026-10-10', form)).toBe(true);
    expect(result.current.validateWorkoutEntry(person, '2026-10-10', { ...form, exercise_id: 0 })).toBe(false);
    expect(result.current.validatePerson(person)).toBe(true);
    expect(result.current.validatePerson(null)).toBe(false);
    expect(showToast).toHaveBeenCalledTimes(3);
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  test('exige rutina y fecha antes de cargarla', () => {
    const showToast = vi.fn();
    const { result } = renderHook(() => useWorkoutValidation({ showToast }));
    expect(result.current.validateRoutineSelection(4, '2026-10-10')).toBe(true);
    expect(result.current.validateRoutineSelection(null, '2026-10-10')).toBe(false);
    expect(result.current.validateRoutineSelection(4, '')).toBe(false);
    expect(showToast).toHaveBeenCalledTimes(2);
  });
});
