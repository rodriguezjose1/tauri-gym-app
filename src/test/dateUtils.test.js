import { describe, it, expect } from 'vitest'

// Copia de la función corregida
const formatDateForDB = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('formatDateForDB (manejo de fechas locales)', () => {
  it('debería mantener la fecha local correcta a las 9 PM (UTC-3)', () => {
    const dateAt9PM = new Date('2024-01-15T21:00:00-03:00')
    expect(formatDateForDB(dateAt9PM)).toBe('2024-01-15')
  })

  it('debería mantener la fecha local correcta a las 11:59 PM (UTC-3)', () => {
    const dateAt1159PM = new Date('2024-01-15T23:59:59-03:00')
    expect(formatDateForDB(dateAt1159PM)).toBe('2024-01-15')
  })

  it('debería cambiar a la fecha correcta a las 12:00 AM (UTC-3)', () => {
    const dateAt12AM = new Date('2024-01-16T00:00:00-03:00')
    expect(formatDateForDB(dateAt12AM)).toBe('2024-01-16')
  })

  it('debería mantener consistencia durante todo el día', () => {
    const baseDate = '2024-01-15'
    const times = [
      '00:00:00', '06:00:00', '12:00:00', '18:00:00', '21:00:00', '23:59:59'
    ]
    times.forEach(time => {
      const date = new Date(`${baseDate}T${time}-03:00`)
      expect(formatDateForDB(date)).toBe('2024-01-15')
    })
  })

  it('debería manejar correctamente el cambio de día a medianoche', () => {
    const lastMinute = new Date('2024-01-15T23:59:59-03:00')
    const firstMinute = new Date('2024-01-16T00:00:00-03:00')
    expect(formatDateForDB(lastMinute)).toBe('2024-01-15')
    expect(formatDateForDB(firstMinute)).toBe('2024-01-16')
  })
}) 