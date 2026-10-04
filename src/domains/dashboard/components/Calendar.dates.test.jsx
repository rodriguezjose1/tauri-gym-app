import { act, cleanup, render, screen, within } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigProvider } from '../../../shared/contexts'
import { WeeklyCalendar } from './WeeklyCalendar'
import { CalendarGrid } from './CalendarGrid'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2024-01-15T12:00:00-03:00'))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const wrapper = ({ children }) => (
  <ChakraProvider value={defaultSystem}><ConfigProvider>{children}</ConfigProvider></ChakraProvider>
)

describe.each([
  ['WeeklyCalendar', WeeklyCalendar, '.weekly-calendar-day'],
  ['CalendarGrid', CalendarGrid, '.calendar-day'],
])('%s: fechas de entrenamientos', (_name, Calendar, daySelector) => {
  it('muestra datos válidos en el día local y avisa de los inválidos sin modificarlos', async () => {
    const entries = Object.freeze([
      Object.freeze({ id: 1, date: '2024-01-15', exercise_name: 'Fecha sin hora', group_number: 1 }),
      Object.freeze({ id: 2, date: '2024-01-16T02:59:59Z', exercise_name: 'Fecha UTC', group_number: 1 }),
      Object.freeze({ id: 3, date: '2024-02-30', exercise_name: 'Fecha imposible' }),
      Object.freeze({ id: 4, date: null, exercise_name: 'Fecha ausente' }),
    ])
    const onChange = vi.fn()
    const props = {
      workoutData: entries,
      selectedPerson: { id: 1, name: 'Ana', last_name: 'Perez', phone: '' },
      threeWeeks: [Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 14 + i))],
      onWorkoutDataChange: onChange,
      onDayClick: vi.fn(), onDayRightClick: vi.fn(), onAddWorkoutClick: vi.fn(),
      onDeleteWorkoutEntry: vi.fn(), handlePersonSelect: vi.fn(), handleClearSelection: vi.fn(),
    }
    let view
    await act(async () => { view = render(<Calendar {...props} />, { wrapper }) })
    expect(screen.getByRole('alert')).toHaveTextContent('2 entrenamiento(s) con fecha inválida')
    for (const name of ['Fecha sin hora', 'Fecha UTC']) {
      const cell = screen.getByText(name).closest(daySelector)
      expect(within(cell).getByText('15', { exact: true })).toBeInTheDocument()
    }
    expect(screen.queryByText('Fecha imposible')).not.toBeInTheDocument()
    expect(screen.queryByText('Fecha ausente')).not.toBeInTheDocument()
    expect(entries[2].date).toBe('2024-02-30')
    expect(onChange).not.toHaveBeenCalled()
    await act(async () => { view.rerender(<Calendar {...props} workoutData={entries.slice(0, 2)} />) })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
