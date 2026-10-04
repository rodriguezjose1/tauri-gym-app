import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDateForDB,
  formatDateStringForDB,
  getCurrentDateString,
  isSameDay,
  isToday,
  tryFormatDateStringForDB,
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

describe('rechazo explícito de entradas inválidas', () => {
  it.each([
    '', ' ', 'not-a-date', null, undefined, 123, {}, '15/01/2024',
    '2024-02-30', '2023-02-29', '1900-02-29', '2024-04-31',
    '2024-00-15', '2024-13-15', '2024-01-00', '2024-01-32', '0000-01-01',
    '2024-02-30T12:00:00Z', '2023-02-29 12:00:00',
    '2024-01-15T24:00:00Z', '2024-01-15T12:60:00Z', '2024-01-15T12:00:60Z',
    '2024-01-15T12:00:00+24:00', '2024-01-15T12:00:00+03:60',
  ])('rechaza %j sin normalizarlo a otra fecha', input => {
    expect(() => formatDateStringForDB(input)).toThrow(RangeError)
    expect(tryFormatDateStringForDB(input)).toBeNull()
  })

  it.each([new Date('invalid'), null, undefined, '2024-01-15', new Date('0000-01-01T12:00:00Z'), new Date('+010000-01-01T12:00:00Z')])('rechaza Date inválido o fuera de rango: %s', input => {
    expect(() => formatDateForDB(input)).toThrow(RangeError)
  })

  it('una fecha inválida nunca coincide con otra ni con hoy', () => {
    const invalid = new Date('invalid')
    const valid = new Date('2024-01-15T12:00:00Z')
    expect(isSameDay(invalid, invalid)).toBe(false)
    expect(isSameDay(invalid, valid)).toBe(false)
    expect(isSameDay(valid, invalid)).toBe(false)
    expect(isSameDay(null, valid)).toBe(false)
    expect(isSameDay(valid, null)).toBe(false)
    expect(isToday(invalid)).toBe(false)
  })

  it.each(['2000-02-29', '2024-02-29', '2024-04-30', '0001-01-01'])('conserva la fecha válida %s', input => {
    expect(formatDateStringForDB(input)).toBe(input)
    expect(tryFormatDateStringForDB(input)).toBe(input)
  })

  it.each([
    ['2024-01-15 23:59:59', '2024-01-15'],
    ['2024-01-16T02:59:59.999Z', '2024-01-15'],
    ['2024-01-16T03:00:00.000Z', '2024-01-16'],
    ['2024-01-16T00:30:00+02:00', '2024-01-15'],
    ['2024-01-15T12:30', '2024-01-15'],
  ])('mantiene la conversión local de %s', (input, expected) => {
    expect(formatDateStringForDB(input)).toBe(expected)
  })
})
