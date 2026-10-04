import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { usePeopleData } from './usePeopleData'
import { useDashboardDataComposer } from '../../dashboard/hooks/useDashboardDataComposer'

const key = 'dashboard-selectedPerson'
const ana = { id: 1, name: 'Ana', last_name: 'Perez', phone: '3511234567' }
const luis = { id: 2, name: 'Luis', last_name: 'Diaz', phone: '3517654321' }
let unexpectedCommands

beforeEach(() => {
  sessionStorage.clear()
  unexpectedCommands = []
  vi.mocked(invoke).mockReset()
  vi.mocked(invoke).mockImplementation(async (command, args) => {
    switch (command) {
      case 'get_persons_paginated':
        expect(args).toEqual({ page: 1, pageSize: 100 })
        return [ana, luis]
      case 'list_routines_paginated':
        expect(args).toEqual({ page: 1, pageSize: 100 })
        return []
      case 'get_workout_entries_by_person':
        expect([ana.id, luis.id]).toContain(args.personId)
        return []
      default:
        unexpectedCommands.push(command)
        throw new Error(`Comando Tauri no previsto: ${command}`)
    }
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  sessionStorage.clear()
  // Services catch invoke errors, so assert here as well to avoid silent mocks.
  expect(unexpectedCommands).toEqual([])
})

async function mount(useHook = usePeopleData) {
  let hook
  await act(async () => {
    hook = renderHook(useHook)
  })
  expect(hook.result.current.peopleLoading).toBe(false)
  expect(hook.result.current.people).toEqual([ana, luis])
  expect(hook.result.current.error).toBeNull()
  return hook
}

describe('selección persistida: hook productivo usePeopleData', () => {
  it('inicia sin selección y conserva otras claves de la sesión', async () => {
    sessionStorage.setItem('unrelated', 'keep')
    const { result } = await mount()
    expect(result.current.selectedPerson).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('keep')
  })

  it('restaura una persona desde sessionStorage', async () => {
    sessionStorage.setItem(key, JSON.stringify(ana))
    const { result } = await mount()
    expect(result.current.selectedPerson).toEqual(ana)
  })

  it('persiste selección, cambio y limpieza usando el almacenamiento de jsdom', async () => {
    const { result } = await mount()
    act(() => result.current.handlePersonSelect(ana))
    expect(result.current.selectedPerson).toEqual(ana)
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(ana)
    act(() => result.current.handlePersonSelect(luis))
    expect(result.current.selectedPerson).toEqual(luis)
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(luis)
    act(() => result.current.handlePersonSelect(null))
    expect(result.current.selectedPerson).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('restaura tras desmontar y no revive una selección que fue limpiada', async () => {
    const first = await mount()
    act(() => first.result.current.handlePersonSelect(ana))
    first.unmount()
    const second = await mount()
    expect(second.result.current.selectedPerson).toEqual(ana)
    // DashboardController clears via this setter rather than handlePersonSelect.
    act(() => second.result.current.setSelectedPerson(null))
    second.unmount()
    const third = await mount()
    expect(third.result.current.selectedPerson).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('no recupera la selección desde el localStorage legado', async () => {
    global.localStorageMock.getItem.mockReturnValue(JSON.stringify(ana))
    const { result } = await mount()
    expect(result.current.selectedPerson).toBeNull()
    expect(global.localStorageMock.getItem).not.toHaveBeenCalled()
    expect(global.localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('conecta la restauración con el compositor real utilizado por Dashboard', async () => {
    sessionStorage.setItem(key, JSON.stringify(ana))
    const first = await mount(useDashboardDataComposer)
    expect(first.result.current.selectedPerson).toEqual(ana)
    expect(invoke).toHaveBeenCalledWith('get_workout_entries_by_person', { personId: ana.id })
    await act(async () => first.result.current.handlePersonSelect(luis))
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(luis)
    first.unmount()
    const second = await mount(useDashboardDataComposer)
    expect(second.result.current.selectedPerson).toEqual(luis)
    expect(invoke).toHaveBeenCalledWith('get_workout_entries_by_person', { personId: luis.id })
  })
})

// Diagnostic assertions document existing defects; they do not endorse crashes.
// See docs/testing/incremento-1.md (SESION-01 through SESION-03).
describe('diagnóstico de persistencia: comportamiento actual sin corregir', () => {
  it('SESION-01: JSON corrupto impide montar el hook', () => {
    sessionStorage.setItem(key, '{invalid')
    expect(() => renderHook(usePeopleData)).toThrow(SyntaxError)
  })

  it('SESION-02: lectura bloqueada impide montar el hook', () => {
    const failure = new DOMException('Storage blocked', 'SecurityError')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw failure })
    expect(() => renderHook(usePeopleData)).toThrow(expect.objectContaining({ name: failure.name, message: failure.message }))
  })

  it('SESION-02: cuota agotada propaga el error al seleccionar y no persiste', async () => {
    const { result } = await mount()
    const failure = new DOMException('Storage full', 'QuotaExceededError')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw failure })
    expect(() => act(() => result.current.handlePersonSelect(ana))).toThrow(expect.objectContaining({ name: failure.name, message: failure.message }))
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('SESION-02: fallo al borrar conserva la selección anterior en storage', async () => {
    sessionStorage.setItem(key, JSON.stringify(ana))
    const { result } = await mount()
    const failure = new DOMException('Storage blocked', 'SecurityError')
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw failure })
    expect(() => act(() => result.current.setSelectedPerson(null))).toThrow(expect.objectContaining({ name: failure.name, message: failure.message }))
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(ana)
  })

  it('SESION-03: JSON válido sin estructura de persona se acepta como selección', async () => {
    sessionStorage.setItem(key, JSON.stringify({ unexpected: true }))
    const { result } = await mount()
    expect(result.current.selectedPerson).toEqual({ unexpected: true })
  })
})
