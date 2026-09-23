import { describe, it, expect } from 'vitest'
import { formatNumber } from '../format'

describe('format', () => {
  describe('formatNumber', () => {
    it('rounds sub-thousand values to one decimal place', () => {
      expect(formatNumber(100.830999999999999)).toBe('100.8')
    })

    it('drops the decimal when the rounded value is a whole number', () => {
      expect(formatNumber(200)).toBe('200')
    })

    it('formats thousands with a K suffix', () => {
      expect(formatNumber(1500)).toBe('1.5K')
    })

    it('formats millions with an M suffix', () => {
      expect(formatNumber(2_340_000)).toBe('2.34M')
    })

    it('formats billions and trillions', () => {
      expect(formatNumber(1_000_000_000)).toBe('1B')
      expect(formatNumber(1_000_000_000_000)).toBe('1T')
    })

    it('falls back to letter suffixes beyond trillions', () => {
      expect(formatNumber(1e15)).toBe('1aa')
      expect(formatNumber(1e18)).toBe('1ab')
    })

    it('falls back to scientific notation past the letter tiers', () => {
      expect(formatNumber(1e60)).toBe('1e60')
    })

    it('preserves the sign of negative values', () => {
      expect(formatNumber(-1500)).toBe('-1.5K')
    })
  })

  it('honours a custom decimal count below one thousand', () => {
    expect(formatNumber(1.05, 2)).toBe('1.05')
    expect(formatNumber(1.234, 2)).toBe('1.23')
    expect(formatNumber(17.490062499, 2)).toBe('17.49')
  })
})
