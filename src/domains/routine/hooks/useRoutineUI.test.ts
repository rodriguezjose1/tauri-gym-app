import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useRoutineUI } from './useRoutineUI';

describe('useRoutineUI', () => {
  test('abre, cierra y alterna ambos modales independientemente', () => {
    const { result } = renderHook(() => useRoutineUI());
    act(() => result.current.openCreateForm());
    act(() => result.current.openExerciseSearch());
    expect(result.current).toMatchObject({ showCreateForm: true, showExerciseSearch: true });
    act(() => result.current.closeCreateForm());
    act(() => result.current.toggleExerciseSearch());
    expect(result.current).toMatchObject({ showCreateForm: false, showExerciseSearch: false });
    act(() => result.current.toggleCreateForm());
    expect(result.current.showCreateForm).toBe(true);
  });
});
