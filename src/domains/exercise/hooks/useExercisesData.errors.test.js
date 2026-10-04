import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { useExercisesData } from './useExercisesData'

describe('useExercisesData ante fallos de lectura', () => {
  it('conserva el catálogo anterior y expone el error si también falla el fallback', async () => {
    const existing = [{ id: 1, name: 'Sentadilla', code: 'SQ' }]
    vi.mocked(invoke).mockRejectedValue(new Error('database is locked'))
    const { result } = renderHook(() => useExercisesData())
    act(() => result.current.setExercises(existing))

    await act(async () => result.current.loadExercises())

    expect(result.current.exercises).toEqual(existing)
    expect(result.current.error).toBe('Error loading exercises')
  })
})
