import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { useWorkoutData } from './useWorkoutData'

describe('filtrado de entrenamientos por fecha', () => {
  it('omite fechas inválidas sin borrar datos ni cambiar de día las fechas sin hora', () => {
    const entries = [
      { id: 1, date: '2024-01-15' },
      { id: 2, date: '2024-01-16T02:59:59Z' },
      { id: 3, date: '2024-02-30' },
      { id: 4, date: 'invalid' },
      { id: 5, date: null },
      { id: 6, date: '2024-01-16T03:00:00Z' },
    ]
    const { result } = renderHook(() => useWorkoutData({ selectedPerson: null }))
    act(() => result.current.setWorkoutData(entries))
    expect(result.current.getWorkoutEntriesForDate('2024-01-15').map(e => e.id)).toEqual([1, 2])
    expect(result.current.getWorkoutEntriesForDate('2024-01-16').map(e => e.id)).toEqual([6])
    expect(result.current.getWorkoutEntriesForDate('2024-02-30')).toEqual([])
    expect(result.current.workoutData).toEqual(entries)
  })

  it('conserva los entrenamientos cargados cuando falla una lectura', async () => {
    const existing = [{ id: 1, person_id: 7, date: '2024-01-15' }]
    vi.mocked(invoke).mockRejectedValue(new Error('database is locked'))
    const { result } = renderHook(() => useWorkoutData({ selectedPerson: { id: 7 } }))
    act(() => result.current.setWorkoutData(existing))

    await act(async () => result.current.loadWorkoutEntries(7))

    expect(result.current.workoutData).toEqual(existing)
    expect(result.current.error).toBe('Error loading workout entries')
  })
})
