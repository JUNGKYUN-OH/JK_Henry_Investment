import { describe, it, expect } from 'vitest'
import { isTradingDay, getPrevTradingDay } from './tradingDay'

describe('isTradingDay', () => {
  it('2025-01-01 (New Year\'s Day) → false', () => {
    expect(isTradingDay('2025-01-01')).toBe(false)
  })

  it('2025-07-04 (Independence Day) → false', () => {
    expect(isTradingDay('2025-07-04')).toBe(false)
  })

  it('2025-11-27 (Thanksgiving) → false', () => {
    expect(isTradingDay('2025-11-27')).toBe(false)
  })

  it('2025-11-28 (Friday after Thanksgiving) → true', () => {
    expect(isTradingDay('2025-11-28')).toBe(true)
  })

  it('2025-05-03 (Saturday) → false', () => {
    expect(isTradingDay('2025-05-03')).toBe(false)
  })

  it('2025-05-04 (Sunday) → false', () => {
    expect(isTradingDay('2025-05-04')).toBe(false)
  })

  it('2025-05-05 (Monday, non-holiday) → true', () => {
    expect(isTradingDay('2025-05-05')).toBe(true)
  })
})

describe('getPrevTradingDay', () => {
  it('Monday → previous Friday', () => {
    expect(getPrevTradingDay('2025-05-05')).toBe('2025-05-02')
  })

  it('Tuesday → Monday', () => {
    expect(getPrevTradingDay('2025-05-06')).toBe('2025-05-05')
  })

  it('skips holiday: day after New Year\'s → Dec 31', () => {
    expect(getPrevTradingDay('2025-01-02')).toBe('2024-12-31')
  })
})
