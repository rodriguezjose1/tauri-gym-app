import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { setupDashboardFixture, renderDashboard, selectPerson, person, otherPerson, storageKey } from './helpers/dashboard'

const backend = setupDashboardFixture()

describe('Dashboard: selección y calendario', () => {
  it('carga personas y rutinas sin cargar ejercicios ni entrenamientos sin persona', async () => {
    await renderDashboard()
    expect(screen.getByPlaceholderText(/buscar persona/i)).toBeInTheDocument()
    expect(invoke).toHaveBeenCalledWith('get_persons_paginated', { page: 1, pageSize: 100 })
    expect(invoke).toHaveBeenCalledWith('list_routines_paginated', { page: 1, pageSize: 100 })
    for (const command of ['get_exercises', 'get_exercises_paginated', 'get_workout_entries_by_person']) {
      expect(invoke.mock.calls.map(([name]) => name)).not.toContain(command)
    }
  })

  it('selecciona una persona, muestra sus datos y persiste en sessionStorage', async () => {
    await renderDashboard()
    await selectPerson(userEvent.setup())
    expect(screen.getByText('📞 3511234567')).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem(storageKey))).toEqual(person)
    expect(invoke).toHaveBeenCalledWith('get_workout_entries_by_person', { personId: person.id })
    expect(await screen.findByText('Flexiones')).toBeInTheDocument()
  })

  it('restaura la persona y ubica los entrenamientos en la fecha correcta', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    await renderDashboard()
    expect(screen.getByText('Ana Perez')).toBeInTheDocument()
    const entry = await screen.findByText('Flexiones')
    expect(within(entry.closest('.weekly-calendar-day')).getByText('15', { exact: true })).toBeInTheDocument()
  })

  it('Cambiar abre la búsqueda y Cancelar conserva selección y entrenamientos', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Cambiar' }))
    expect(screen.getByPlaceholderText(/buscar persona/i)).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem(storageKey))).toEqual(person)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Ana Perez')).toBeInTheDocument()
    expect(screen.getByText('Flexiones')).toBeInTheDocument()
  })

  it('cambiar persona reemplaza entrenamientos y selección guardada', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    backend.entries.push({ ...backend.entries[0], id: 20, person_id: 2, exercise_name: 'Sentadillas' })
    const user = userEvent.setup()
    await renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Cambiar' }))
    await selectPerson(user, otherPerson)
    expect(await screen.findByText('Sentadillas')).toBeInTheDocument()
    expect(screen.queryByText('Flexiones')).not.toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem(storageKey))).toEqual(otherPerson)
  })

  it('eliminar un entrenamiento actualiza el calendario después de recargar', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    await renderDashboard()
    await userEvent.setup().click(screen.getByTitle('Eliminar ejercicio'))
    await waitFor(() => expect(screen.queryByText('Flexiones')).not.toBeInTheDocument())
    expect(invoke).toHaveBeenCalledWith('delete_workout_entry', { id: 10 })
    expect(invoke).toHaveBeenCalledWith('renumber_workout_groups', { personId: 1, date: '2024-01-15' })
    expect(backend.entries).toEqual([])
  })

  it('recupera la selección después de desmontar y volver a abrir el Dashboard', async () => {
    const view = await renderDashboard()
    await selectPerson(userEvent.setup())
    view.unmount()
    await renderDashboard()
    expect(screen.getByText('Ana Perez')).toBeInTheDocument()
    expect(await screen.findByText('Flexiones')).toBeInTheDocument()
  })

  it('busca ejercicios por demanda al escribir en el formulario', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    await renderDashboard()
    fireEvent.contextMenu(screen.getAllByText('Sin entrenamientos')[0].closest('.weekly-calendar-day'))
    await userEvent.setup().type(screen.getByPlaceholderText('Buscar ejercicio...'), 'Fl')
    expect(await screen.findByText('Flexiones', { selector: '.exercise-autocomplete-item-name' })).toBeInTheDocument()
    expect(invoke).toHaveBeenCalledWith('search_exercises_paginated', { query: 'Fl', page: 1, pageSize: 10 })
  })

  it('carga una rutina en una sesión, la guarda y la muestra tras recargar datos', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify(person))
    backend.routines = [{
      id: 5,
      name: 'Piernas',
      code: 'P1',
      exercises: [{
        id: 50,
        routine_id: 5,
        exercise_id: 2,
        exercise_name: 'Sentadillas',
        exercise_code: 'SQ',
        sets: 4,
        reps: 8,
        weight: 60,
        notes: '',
        order_index: 0,
        group_number: 1
      }]
    }]
    const user = userEvent.setup()
    await renderDashboard()

    const emptyDay = screen.getAllByText('Sin entrenamientos')[0].closest('.weekly-calendar-day')
    const selectedDate = emptyDay.getAttribute('data-date')
    await user.click(within(emptyDay).getByTitle('Agregar entrenamiento'))
    expect(await screen.findByText('Nueva Sesión de Entrenamiento')).toBeInTheDocument()

    await user.selectOptions(screen.getByDisplayValue('Seleccionar rutina...'), '5')
    await user.click(screen.getByRole('button', { name: '📋' }))
    expect(await screen.findByDisplayValue('Sentadillas (SQ)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar Sesión' }))

    await waitFor(() => expect(backend.entries.some(entry => entry.exercise_id === 2 && entry.date === selectedDate)).toBe(true))
    expect(await screen.findByText('Sentadillas')).toBeInTheDocument()
    expect(invoke).toHaveBeenCalledWith('create_batch', expect.objectContaining({
      workoutEntries: [expect.objectContaining({ person_id: 1, exercise_id: 2, date: selectedDate })]
    }))
  })
})
