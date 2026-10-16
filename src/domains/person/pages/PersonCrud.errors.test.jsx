import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import PersonCrud from './PersonCrud'
import { MemoryRouter } from 'react-router-dom'

describe('PersonCrud ante fallos del backend', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'count_deleted_people') return 0
      if (command === 'get_payment_status_counts') return { all: 0, overdue: 0, pending: 0, current: 0, no_plan: 0 }
      if (command === 'get_persons_payment_page') {
        throw new Error('database is locked')
      }
      throw new Error(`Comando Tauri no previsto: ${command}`)
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('distingue un error de lectura de una lista vacía', async () => {
    render(<MemoryRouter><PersonCrud /></MemoryRouter>)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las personas.',
    )
    expect(invoke).toHaveBeenCalledWith('get_persons_payment_page', {
      query: '',
      paymentStatus: 'all',
      page: 1,
      pageSize: 10,
    })
  })
})
