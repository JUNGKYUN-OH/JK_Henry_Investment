import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@libsql/client'
import { setDb, initSchema } from '@/lib/db'
import { addTicker } from './ticker'
import {
  createPlan,
  getAllPlans,
  getPlanById,
  getActivePlanByTicker,
  recordDailyEntry,
  isDuplicateDate,
} from './plan'

beforeEach(async () => {
  const db = createClient({ url: ':memory:' })
  await initSchema(db)
  setDb(db)
  await addTicker('AAPL')
  await addTicker('MSFT')
})

describe('createPlan', () => {
  it('creates a plan with dailyAmount = totalAmount / 40', async () => {
    const plan = await createPlan('AAPL', 4000)
    expect(plan.tickerId).toBe('AAPL')
    expect(plan.totalAmount).toBe(4000)
    expect(plan.dailyAmount).toBe(100)
    expect(plan.status).toBe('active')
  })

  it('returns the plan with progress fields', async () => {
    const plan = (await getPlanById((await createPlan('AAPL', 4000)).id))!
    expect(plan.completedDays).toBe(0)
    expect(plan.remainingAmount).toBe(4000)
    expect(plan.planAvgCost).toBeNull()
    expect(plan.targetSellPrice).toBeNull()
  })

  it('rejects duplicate active plan for same ticker (S11)', async () => {
    await createPlan('AAPL', 4000)
    await expect(createPlan('AAPL', 2000)).rejects.toThrow()
  })

  it('allows plan for different ticker', async () => {
    await createPlan('AAPL', 4000)
    await expect(createPlan('MSFT', 2000)).resolves.not.toThrow()
  })
})

describe('recordDailyEntry', () => {
  it('records a buy transaction linked to the plan', async () => {
    const plan = await createPlan('AAPL', 4000)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 1 })
    const updated = (await getPlanById(plan.id))!
    expect(updated.completedDays).toBe(1)
  })

  it('calculates planAvgCost from plan transactions only', async () => {
    const plan = await createPlan('AAPL', 4000)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 0 })
    await recordDailyEntry(plan.id, { date: '2024-01-02', quantity: 10, price: 120, fee: 0 })
    const updated = (await getPlanById(plan.id))!
    expect(updated.planAvgCost).toBeCloseTo(110, 5)
    expect(updated.targetSellPrice).toBeCloseTo(121, 5)
  })

  it('remainingAmount reflects actual spend, not target days (C2 fix)', async () => {
    const plan = await createPlan('AAPL', 4000)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 9.5, fee: 0 })
    const updated = (await getPlanById(plan.id))!
    expect(updated.remainingAmount).toBeCloseTo(3905, 2)
  })

  it('rejects duplicate date entry', async () => {
    const plan = await createPlan('AAPL', 4000)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 0 })
    await expect(
      recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 110, fee: 0 })
    ).rejects.toThrow()
  })

  it('auto-completes plan at 40 days (S14)', async () => {
    const plan = await createPlan('AAPL', 4000)
    for (let i = 0; i < 40; i++) {
      const date = `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      await recordDailyEntry(plan.id, { date, quantity: 1, price: 100, fee: 0 })
    }
    const completed = (await getPlanById(plan.id))!
    expect(completed.status).toBe('completed')
    expect(completed.completedDays).toBe(40)
  })
})

describe('isDuplicateDate', () => {
  it('returns false for new date', async () => {
    const plan = await createPlan('AAPL', 4000)
    expect(await isDuplicateDate(plan.id, '2024-01-01')).toBe(false)
  })

  it('returns true after recording that date', async () => {
    const plan = await createPlan('AAPL', 4000)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 5, price: 100, fee: 0 })
    expect(await isDuplicateDate(plan.id, '2024-01-01')).toBe(true)
  })
})

describe('getAllPlans', () => {
  it('returns all plans with progress', async () => {
    await createPlan('AAPL', 4000)
    await createPlan('MSFT', 2000)
    const plans = await getAllPlans()
    expect(plans).toHaveLength(2)
    expect(plans.every((p) => 'completedDays' in p)).toBe(true)
  })
})

describe('getActivePlanByTicker', () => {
  it('returns active plan for ticker', async () => {
    await createPlan('AAPL', 4000)
    const plan = await getActivePlanByTicker('AAPL')
    expect(plan).not.toBeNull()
    expect(plan!.status).toBe('active')
  })

  it('returns null when no active plan', async () => {
    expect(await getActivePlanByTicker('MSFT')).toBeNull()
  })
})
