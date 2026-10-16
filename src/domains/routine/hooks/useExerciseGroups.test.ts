import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useExerciseGroups } from './useExerciseGroups';

const exercise = (id: number, group: number, order: number) => ({
  id,
  routine_id: 1,
  exercise_id: id,
  exercise_name: `Ejercicio ${id}`,
  exercise_code: `E${id}`,
  group_number: group,
  order_index: order,
});

describe('useExerciseGroups', () => {
  test('agrupa y ordena por grupo y orden', () => {
    const exercises = [exercise(3, 2, 1), exercise(2, 1, 2), exercise(1, 1, 1)];
    const { result } = renderHook(() => useExerciseGroups({ exercises }));

    expect(result.current.groupedExercises.map(group => group.groupNumber)).toEqual([1, 2]);
    expect(result.current.groupedExercises[0].exercises.map(item => item.id)).toEqual([1, 2]);
  });

  test('crea grupos consecutivos, permite quitarlos y descarta los que pasan a estar ocupados', async () => {
    const { result, rerender } = renderHook(
      ({ exercises }) => useExerciseGroups({ exercises }),
      { initialProps: { exercises: [exercise(1, 1, 1)] } },
    );

    act(() => result.current.createEmptyGroup());
    expect(result.current.emptyGroups[0].groupNumber).toBe(2);
    rerender({ exercises: [exercise(1, 1, 1), exercise(2, 2, 1)] });
    await waitFor(() => expect(result.current.emptyGroups).toEqual([]));

    act(() => result.current.createEmptyGroup());
    expect(result.current.emptyGroups[0].groupNumber).toBe(3);
    act(() => result.current.removeEmptyGroup(3));
    expect(result.current.emptyGroups).toEqual([]);
  });
});
