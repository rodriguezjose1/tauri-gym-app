import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDateForDB,
  formatDateStringForDB,
  getCurrentDateString,
  isSameDay,
  isToday,
} from './dateUtils'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('formatDateForDB: fecha local de Córdoba (UTC-3)', () => {
  it.each([
    ['2024-01-15T00:00:00-03:00', '2024-01-15'],
    ['2024-01-15T21:00:00-03:00', '2024-01-15'],
    ['2024-01-15T23:59:59-03:00', '2024-01-15'],
    ['2024-01-16T00:00:00-03:00', '2024-01-16'],
    ['2024-03-01T02:59:59Z', '2024-02-29'],
    ['2025-01-01T02:59:59Z', '2024-12-31'],
    ['2025-01-01T03:00:00Z', '2025-01-01'],
  ])('formatea %s como %s', (input, expected) => {
    expect(formatDateForDB(new Date(input))).toBe(expected)
  })
})

describe('formatDateStringForDB', () => {
  it('conserva una fecha sin hora, sin desplazarla al día anterior', () => {
    expect(formatDateStringForDB('2024-01-15')).toBe('2024-01-15')
  })

  it.each([
    ['2024-01-16T02:59:59Z', '2024-01-15'],
    ['2024-01-16T03:00:00Z', '2024-01-16'],
    ['2024-01-15T23:59:59-03:00', '2024-01-15'],
    ['2024-01-15T23:59:59', '2024-01-15'],
  ])('convierte %s a la fecha local %s', (input, expected) => {
    expect(formatDateStringForDB(input)).toBe(expected)
  })
})

describe('comparación de días y reloj controlado', () => {
  it('compara el día local aunque los timestamps pertenezcan a días UTC distintos', () => {
    expect(isSameDay(new Date('2024-01-15T12:00:00Z'), new Date('2024-01-16T02:59:59Z'))).toBe(true)
    expect(isSameDay(new Date('2024-01-16T02:59:59Z'), new Date('2024-01-16T03:00:00Z'))).toBe(false)
  })

  it('isToday y getCurrentDateString cambian al cruzar medianoche local', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-16T02:59:59Z'))
    const yesterday = new Date('2024-01-15T12:00:00-03:00')
    const today = new Date('2024-01-16T12:00:00-03:00')
    expect(getCurrentDateString()).toBe('2024-01-15')
    expect(isToday(yesterday)).toBe(true)
    expect(isToday(today)).toBe(false)

    vi.setSystemTime(new Date('2024-01-16T03:00:00Z'))
    expect(getCurrentDateString()).toBe('2024-01-16')
    expect(isToday(yesterday)).toBe(false)
    expect(isToday(today)).toBe(true)
  })
})

// Characterization only: these assertions reproduce findings, not desired contracts.
// See docs/testing/incremento-1.md (FECHA-01 and FECHA-02).
describe('diagnóstico: entradas inválidas (comportamiento actual)', () => {
  it.each(['', 'not-a-date'])('devuelve %j sin corregir y registra el error', (input) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(formatDateStringForDB(input)).toBe(input)
    expect(error).toHaveBeenCalledWith('Invalid date string:', input)
  })

  it('FECHA-01: una fecha imposible con formato YYYY-MM-DD pasa sin validación', () => {
    expect(formatDateStringForDB('2024-02-30')).toBe('2024-02-30')
  })

  it('FECHA-02: Date inválido produce NaN-NaN-NaN y dos inválidos se consideran iguales', () => {
    expect(formatDateForDB(new Date('invalid'))).toBe('NaN-NaN-NaN')
    expect(isSameDay(new Date('invalid'), new Date('invalid'))).toBe(true)
  })
})
