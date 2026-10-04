import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import PersonCrud from './PersonCrud'

describe('PersonCrud ante fallos del backend', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'count_deleted_people') return 0
      if (command === 'get_persons_paginated_response') {
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
    render(<PersonCrud />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las personas.',
    )
    expect(invoke).toHaveBeenCalledWith('get_persons_paginated_response', {
      page: 1,
      pageSize: 10,
    })
  })
})
