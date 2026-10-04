import { act, cleanup, render, screen } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import Dashboard from '../../domains/dashboard/pages/Dashboard'
import { ConfigProvider } from '../../shared/contexts'

export const person = { id: 1, name: 'Ana', last_name: 'Perez', phone: '3511234567' }
export const otherPerson = { id: 2, name: 'Luis', last_name: 'Diaz', phone: '3517654321' }
export const storageKey = 'dashboard-selectedPerson'
export const workout = { id: 10, person_id: 1, exercise_id: 1, date: '2024-01-15', exercise_name: 'Flexiones', exercise_code: 'FL', sets: 3, reps: 10, weight: 0, notes: '', group_number: 1, order_index: 0 }

// Mock only the Tauri boundary; keep components, hooks and services real.
export function setupDashboardFixture() {
  const backend = { entries: [], overrides: {} }
  let unexpected
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2024-01-15T12:00:00-03:00'))
    backend.entries = [{ ...workout }]
    backend.overrides = {}
    unexpected = []
    vi.mocked(invoke).mockReset()
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (Object.hasOwn(backend.overrides, command)) return backend.overrides[command](args)
      switch (command) {
        case 'get_persons_paginated': return [person, otherPerson]
        case 'search_persons_paginated': return [person, otherPerson].filter(p => `${p.name} ${p.last_name}`.toLowerCase().includes(args.query.toLowerCase()))
        case 'list_routines_paginated': return []
        case 'get_workout_entries_by_person': return backend.entries.filter(e => e.person_id === args.personId)
        case 'delete_workout_entry': backend.entries = backend.entries.filter(e => e.id !== args.id); return
        case 'renumber_workout_groups': return
        case 'search_exercises_paginated': return { exercises: [{ id: 1, name: 'Flexiones', code: 'FL' }], total: 1, page: args.page, page_size: args.pageSize, total_pages: 1 }
        default:
          unexpected.push({ command, args })
          throw new Error(`Comando Tauri no previsto: ${command}`)
      }
    })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
    sessionStorage.clear()
    // Services catch errors, so enforce unknown commands after the test as well.
    expect(unexpected).toEqual([])
  })
  return backend
}

export async function renderDashboard() {
  let view
  await act(async () => {
    view = render(<ChakraProvider value={defaultSystem}><MemoryRouter><ConfigProvider><Dashboard /></ConfigProvider></MemoryRouter></ChakraProvider>)
  })
  expect(screen.getByText(/calendario semanal/i)).toBeInTheDocument()
  return view
}

export async function selectPerson(user, target = person) {
  await user.type(screen.getByPlaceholderText(/buscar persona/i), target.name)
  await user.click(await screen.findByText(`${target.name} ${target.last_name}`))
  expect(await screen.findByRole('button', { name: 'Cambiar' })).toBeInTheDocument()
}
