import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { setupDashboardFixture, renderDashboard, selectPerson, person, storageKey } from './helpers/dashboard'

const backend = setupDashboardFixture()

describe('Dashboard: fallos de dependencias y recuperación', () => {
  it.each(['getItem', 'setItem'])('continúa cuando localStorage.%s falla', async method => {
    global.localStorageMock[method].mockImplementation(() => { throw new Error('Storage blocked') })
    await renderDashboard()
    expect(screen.getByRole('alert')).toHaveTextContent(/configuración/i)
    await selectPerson(userEvent.setup())
    expect(await screen.findByText('Flexiones')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    if (method === 'getItem') expect(global.localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('restaura la configuración antes de escribirla y no la confunde con la persona', async () => {
    global.localStorageMock.getItem.mockReturnValue(JSON.stringify({ theme: 'light', showWeekends: true }))
    await renderDashboard()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(screen.getByPlaceholderText(/buscar persona/i)).toBeInTheDocument()
    expect(global.localStorageMock.getItem).toHaveBeenCalledWith('gym-app-config')
    for (const [key, value] of global.localStorageMock.setItem.mock.calls) {
      expect(key).toBe('gym-app-config')
      expect(JSON.parse(value)).toMatchObject({ theme: 'light', showWeekends: true })
    }
    expect(global.localStorageMock.setItem).toHaveBeenCalled()
  })

  it('informa fallo de entrenamientos y permite recuperarse seleccionando de nuevo', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    backend.overrides.get_workout_entries_by_person = () => { throw new Error('Database error') }
    await renderDashboard()
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudieron cargar/i)
    expect(screen.getByText('Ana Perez')).toBeInTheDocument()
    expect(invoke).toHaveBeenCalledWith('get_workout_entries_by_person', { personId: 1 })
    delete backend.overrides.get_workout_entries_by_person
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Cambiar' }))
    await selectPerson(user)
    expect(await screen.findByText('Flexiones')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('informa fallo real de búsqueda de ejercicios y permite reintentar', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    backend.overrides.search_exercises_paginated = () => { throw new Error('Search error') }
    await renderDashboard()
    fireEvent.contextMenu(screen.getAllByText('Sin entrenamientos')[0].closest('.weekly-calendar-day'))
    const user = userEvent.setup()
    const input = screen.getByPlaceholderText('Buscar ejercicio...')
    await user.type(input, 'Fl')
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudieron buscar/i)
    expect(invoke).toHaveBeenCalledWith('search_exercises_paginated', { query: 'Fl', page: 1, pageSize: 10 })
    delete backend.overrides.search_exercises_paginated
    await user.clear(input)
    await user.type(input, 'Flex')
    expect(await screen.findByText('Flexiones', { selector: '.exercise-autocomplete-item-name' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
