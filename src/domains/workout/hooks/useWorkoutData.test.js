import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
