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
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = await mount()
    expect(result.current.selectedPerson).toEqual(ana)
    expect(write).not.toHaveBeenCalled()
    expect(result.current.persistenceWarning).toBeNull()
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

describe('recuperación de persistencia sin interrumpir la selección', () => {
  it('SESION-01: descarta JSON corrupto y permite seleccionar otra persona', async () => {
    sessionStorage.setItem(key, '{invalid')
    sessionStorage.setItem('unrelated', 'keep')
    const { result } = await mount()
    expect(result.current.selectedPerson).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('keep')
    act(() => result.current.handlePersonSelect(ana))
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(ana)
  })

  it('SESION-02: lectura bloqueada permite continuar y no borra el dato anterior', async () => {
    sessionStorage.setItem(key, JSON.stringify(ana))
    const failure = new DOMException('Storage blocked', 'SecurityError')
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw failure })
    const { result } = await mount()
    expect(result.current.selectedPerson).toBeNull()
    expect(result.current.persistenceWarning).toMatch(/no se pudo recuperar/i)
    read.mockRestore()
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(ana)
    act(() => result.current.handlePersonSelect(luis))
    expect(result.current.selectedPerson).toEqual(luis)
    expect(result.current.persistenceWarning).toBeNull()
  })

  it('SESION-02: cuota agotada conserva selección en memoria y permite recuperarse', async () => {
    const { result } = await mount()
    const failure = new DOMException('Storage full', 'QuotaExceededError')
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw failure })
    act(() => result.current.handlePersonSelect(ana))
    expect(result.current.selectedPerson).toEqual(ana)
    expect(result.current.persistenceWarning).toMatch(/no se pudo guardar/i)
    expect(sessionStorage.getItem(key)).toBeNull()
    await act(async () => result.current.loadPeople())
    expect(result.current.persistenceWarning).toMatch(/no se pudo guardar/i)
    write.mockRestore()
    act(() => result.current.handlePersonSelect(luis))
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(luis)
    expect(result.current.persistenceWarning).toBeNull()
  })

  it('SESION-02: fallo al borrar limpia en memoria y avisa que podría reaparecer', async () => {
    sessionStorage.setItem(key, JSON.stringify(ana))
    const { result } = await mount()
    const failure = new DOMException('Storage blocked', 'SecurityError')
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw failure })
    act(() => result.current.setSelectedPerson(null))
    expect(result.current.selectedPerson).toBeNull()
    expect(result.current.persistenceWarning).toMatch(/podría reaparecer/i)
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(ana)
    remove.mockRestore()
    act(() => result.current.setSelectedPerson(null))
    expect(sessionStorage.getItem(key)).toBeNull()
    expect(result.current.persistenceWarning).toBeNull()
  })

  it.each([null, [], true, 42, 'Ana', {}, { unexpected: true },
    { ...ana, id: 0 }, { ...ana, id: -1 }, { ...ana, id: 1.5 },
    { ...ana, id: '1' }, { ...ana, name: null }, { ...ana, name: ' ' },
    { ...ana, last_name: [] }, { ...ana, phone: 123 },
  ])('SESION-03: descarta estructuras inválidas: %j', async (value) => {
    sessionStorage.setItem(key, JSON.stringify(value))
    const { result } = await mount()
    expect(result.current.selectedPerson).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('permite continuar si no se puede descartar una entrada corrupta', async () => {
    sessionStorage.setItem(key, '{invalid')
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked') })
    const { result } = await mount()
    expect(result.current.selectedPerson).toBeNull()
    expect(result.current.persistenceWarning).toMatch(/no se pudo borrar/i)
    act(() => result.current.handlePersonSelect(ana))
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual(ana)
    expect(result.current.persistenceWarning).toBeNull()
  })

  it('contiene también el error del getter sessionStorage', async () => {
    const storage = vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
    const { result } = await mount()
    act(() => result.current.handlePersonSelect(ana))
    expect(result.current.selectedPerson).toEqual(ana)
    expect(result.current.persistenceWarning).toMatch(/no se pudo guardar/i)
    storage.mockRestore()
  })

  it('mantiene el contrato del setter funcional al actualizar y limpiar', async () => {
    sessionStorage.setItem(key, JSON.stringify(ana))
    const { result } = await mount()
    act(() => result.current.setSelectedPerson(previous => ({ ...previous, phone: '123' })))
    expect(JSON.parse(sessionStorage.getItem(key))).toEqual({ ...ana, phone: '123' })
    act(() => result.current.setSelectedPerson(() => null))
    expect(result.current.selectedPerson).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })
})
