import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { setDb } from '@/lib/db'
import { initSchema } from '@/lib/db'
import { addTicker } from './ticker'
import {
  createPlan,
  getAllPlans,
  getPlanById,
  getActivePlanByTicker,
  recordDailyEntry,
  isDuplicateDate,
} from './plan'

function makeDb() {
  const db = new Database(':memory:')
  initSchema(db)
  return db
}

beforeEach(() => {
  setDb(makeDb())
  addTicker('AAPL')
  addTicker('MSFT')
})

describe('createPlan', () => {
  it('creates a plan with dailyAmount = totalAmount / 40', () => {
    const plan = createPlan('AAPL', 4000)
    expect(plan.tickerId).toBe('AAPL')
    expect(plan.totalAmount).toBe(4000)
    expect(plan.dailyAmount).toBe(100)
    expect(plan.status).toBe('active')
  })

  it('returns the plan with progress fields', () => {
    const plan = getPlanById(createPlan('AAPL', 4000).id)!
    expect(plan.completedDays).toBe(0)
    expect(plan.remainingAmount).toBe(4000)
    expect(plan.planAvgCost).toBeNull()
    expect(plan.targetSellPrice).toBeNull()
  })

  it('rejects duplicate active plan for same ticker (S11)', () => {
    createPlan('AAPL', 4000)
    expect(() => createPlan('AAPL', 2000)).toThrow()
  })

  it('allows plan for different ticker', () => {
    createPlan('AAPL', 4000)
    expect(() => createPlan('MSFT', 2000)).not.toThrow()
  })
})

describe('recordDailyEntry', () => {
  it('records a buy transaction linked to the plan', () => {
    const plan = createPlan('AAPL', 4000)
    recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 1 })
    const updated = getPlanById(plan.id)!
    expect(updated.completedDays).toBe(1)
  })

  it('calculates planAvgCost from plan transactions only', () => {
    const plan = createPlan('AAPL', 4000)
    recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 0 })
    recordDailyEntry(plan.id, { date: '2024-01-02', quantity: 10, price: 120, fee: 0 })
    const updated = getPlanById(plan.id)!
    expect(updated.planAvgCost).toBeCloseTo(110, 5)
    expect(updated.targetSellPrice).toBeCloseTo(121, 5)
  })

  it('remainingAmount reflects actual spend, not target days (C2 fix)', () => {
    const plan = createPlan('AAPL', 4000)
    // Day 1: spend $95 instead of $100 target (10 qty @ $9.50)
    recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 9.5, fee: 0 })
    const updated = getPlanById(plan.id)!
    // totalSpent = 10 * 9.50 = $95, remainingAmount should be $3905, not $3900
    expect(updated.remainingAmount).toBeCloseTo(3905, 2)
  })

  it('rejects duplicate date entry', () => {
    const plan = createPlan('AAPL', 4000)
    recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 0 })
    expect(() =>
      recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 110, fee: 0 })
    ).toThrow()
  })

  it('auto-completes plan at 40 days (S14)', () => {
    const plan = createPlan('AAPL', 4000)
    for (let i = 0; i < 40; i++) {
      const date = `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      recordDailyEntry(plan.id, { date, quantity: 1, price: 100, fee: 0 })
    }
    const completed = getPlanById(plan.id)!
    expect(completed.status).toBe('completed')
    expect(completed.completedDays).toBe(40)
  })
})

describe('isDuplicateDate', () => {
  it('returns false for new date', () => {
    const plan = createPlan('AAPL', 4000)
    expect(isDuplicateDate(plan.id, '2024-01-01')).toBe(false)
  })

  it('returns true after recording that date', () => {
    const plan = createPlan('AAPL', 4000)
    recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 5, price: 100, fee: 0 })
    expect(isDuplicateDate(plan.id, '2024-01-01')).toBe(true)
  })
})

describe('getAllPlans', () => {
  it('returns all plans with progress', () => {
    createPlan('AAPL', 4000)
    createPlan('MSFT', 2000)
    const plans = getAllPlans()
    expect(plans).toHaveLength(2)
    expect(plans.every((p) => 'completedDays' in p)).toBe(true)
  })
})

describe('getActivePlanByTicker', () => {
  it('returns active plan for ticker', () => {
    createPlan('AAPL', 4000)
    const plan = getActivePlanByTicker('AAPL')
    expect(plan).not.toBeNull()
    expect(plan!.status).toBe('active')
  })

  it('returns null when no active plan', () => {
    expect(getActivePlanByTicker('MSFT')).toBeNull()
  })
})
