import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { ConfigProvider } from '../../../shared/contexts'
import Dashboard from './Dashboard'

const key = 'dashboard-selectedPerson'
const person = { id: 1, name: 'Ana', last_name: 'Perez', phone: '3511234567' }
let unexpected

beforeEach(() => {
  sessionStorage.clear()
  unexpected = []
  vi.mocked(invoke).mockReset()
  vi.mocked(invoke).mockImplementation(async command => {
    switch (command) {
      case 'get_persons_paginated':
      case 'search_persons_paginated': return [person]
      case 'list_routines_paginated':
      case 'get_workout_entries_by_person':
      case 'get_workout_entries_by_person_and_date_range': return []
      default:
        unexpected.push(command)
        throw new Error(`Unexpected command: ${command}`)
    }
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  sessionStorage.clear()
  expect(unexpected).toEqual([])
})

async function mount() {
  await act(async () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <BrowserRouter>
          <ConfigProvider><Dashboard /></ConfigProvider>
        </BrowserRouter>
      </ChakraProvider>,
    )
  })
  expect(screen.getByText(/calendario semanal/i)).toBeInTheDocument()
}

async function selectPerson(user) {
  await user.type(screen.getByPlaceholderText(/buscar persona/i), 'Ana')
  await user.click(await screen.findByText('Ana Perez'))
  expect(await screen.findByRole('button', { name: 'Cambiar' })).toBeInTheDocument()
}

describe('Dashboard: recuperación de selección desde la pantalla real', () => {
  it.each(['{invalid', JSON.stringify({ id: 1 })])('descarta %s y permite buscar y seleccionar', async value => {
    sessionStorage.setItem(key, value)
    await mount()
    expect(sessionStorage.getItem(key)).toBeNull()
    await selectPerson(userEvent.setup())
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(person)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('avisa si la lectura está bloqueada y permite seleccionar', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
    await mount()
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo recuperar/i)
    await selectPerson(userEvent.setup())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('conserva la persona visible y avisa cuando no puede guardar', async () => {
    await mount()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    await selectPerson(userEvent.setup())
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar/i)
    expect(screen.getByText('Ana Perez')).toBeInTheDocument()
    expect(sessionStorage.getItem(key)).toBeNull()
  })
})
