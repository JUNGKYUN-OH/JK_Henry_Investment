import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@libsql/client'
import { setDb, initSchema, type DbClient } from '@/lib/db'
import { addTicker } from './ticker'
import {
  createPlan,
  getAllPlans,
  getPlanById,
  getActivePlanByTicker,
  recordDailyEntry,
  isDuplicateDate,
  computeSellSignal,
  recordSell,
} from './plan'

beforeEach(async () => {
  const db = createClient({ url: ':memory:' })
  await initSchema(db as unknown as DbClient)
  setDb(db as unknown as DbClient)
  await addTicker('AAPL')
  await addTicker('MSFT')
})

describe('createPlan', () => {
  it('creates a plan with dailyAmount = totalAmount / 40 (default splits)', async () => {
    const plan = await createPlan('AAPL', 4000)
    expect(plan.tickerId).toBe('AAPL')
    expect(plan.totalAmount).toBe(4000)
    expect(plan.dailyAmount).toBe(100)
    expect(plan.splits).toBe(40)
    expect(plan.targetReturn).toBeCloseTo(0.1)
    expect(plan.status).toBe('active')
  })

  it('creates a plan with custom splits and targetReturn', async () => {
    const plan = await createPlan('AAPL', 2000, 20, 0.15)
    expect(plan.dailyAmount).toBe(100)
    expect(plan.splits).toBe(20)
    expect(plan.targetReturn).toBeCloseTo(0.15)
  })

  it('returns the plan with progress fields', async () => {
    const plan = (await getPlanById((await createPlan('AAPL', 4000)).id))!
    expect(plan.completedDays).toBe(0)
    expect(plan.remainingAmount).toBe(4000)
    expect(plan.planAvgCost).toBeNull()
    expect(plan.targetSellPrice).toBeNull()
    expect(plan.splits).toBe(40)
    expect(plan.targetReturn).toBeCloseTo(0.1)
  })

  it('rejects duplicate active plan for same ticker', async () => {
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
  })

  it('targetSellPrice uses plan targetReturn (not hardcoded 10%)', async () => {
    const plan = await createPlan('AAPL', 2000, 20, 0.15)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 0 })
    const updated = (await getPlanById(plan.id))!
    expect(updated.targetSellPrice).toBeCloseTo(115, 5)
  })

  it('remainingAmount reflects actual spend', async () => {
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

  it('auto-completes plan at splits days', async () => {
    const plan = await createPlan('AAPL', 2000, 5, 0.1)
    for (let i = 0; i < 5; i++) {
      const date = `2024-01-${String(i + 1).padStart(2, '0')}`
      await recordDailyEntry(plan.id, { date, quantity: 1, price: 100, fee: 0 })
    }
    const completed = (await getPlanById(plan.id))!
    expect(completed.status).toBe('completed')
    expect(completed.completedDays).toBe(5)
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
    expect(plans.every((p) => 'splits' in p)).toBe(true)
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

describe('computeSellSignal', () => {
  const base = {
    completedDays: 15,
    splits: 40,
    targetReturn: 0.1,
    planAvgCost: 100,
    firstSellCompleted: false,
  }

  it('returns null when no planAvgCost', () => {
    expect(computeSellSignal({ ...base, planAvgCost: null }, 120)).toBeNull()
  })

  it('completedDays <= N/2, price >= avgCost*(1+targetReturn) → full', () => {
    expect(computeSellSignal({ ...base, completedDays: 15 }, 110)).toBe('full')
  })

  it('completedDays <= N/2, price < avgCost*(1+targetReturn) → null', () => {
    expect(computeSellSignal({ ...base, completedDays: 15 }, 109)).toBeNull()
  })

  it('completedDays > N/2, no first sell, price >= avgCost*1.05 → first', () => {
    expect(computeSellSignal({ ...base, completedDays: 25, firstSellCompleted: false }, 105)).toBe('first')
  })

  it('completedDays > N/2, no first sell, price < avgCost*1.05 → null', () => {
    expect(computeSellSignal({ ...base, completedDays: 25, firstSellCompleted: false }, 104)).toBeNull()
  })

  it('completedDays > N/2, first sell done, price >= avgCost*(1+targetReturn) → second', () => {
    expect(computeSellSignal({ ...base, completedDays: 25, firstSellCompleted: true }, 110)).toBe('second')
  })

  it('completedDays > N/2, first sell done, price < target → null', () => {
    expect(computeSellSignal({ ...base, completedDays: 25, firstSellCompleted: true }, 109)).toBeNull()
  })
})

describe('recordSell', () => {
  it('full sell → plan status completed', async () => {
    const plan = await createPlan('AAPL', 4000)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 0 })
    await recordSell(plan.id, { date: '2024-01-15', quantity: 10, price: 110, fee: 0 })
    const updated = (await getPlanById(plan.id))!
    expect(updated.status).toBe('completed')
  })

  it('first sell (partial) → plan stays active, firstSellCompleted true', async () => {
    const plan = await createPlan('AAPL', 4000)
    for (let i = 0; i < 25; i++) {
      const date = `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      await recordDailyEntry(plan.id, { date, quantity: 1, price: 100, fee: 0 })
    }
    // 1st sell: 50% of holdings
    await recordSell(plan.id, { date: '2024-02-28', quantity: 12, price: 105, fee: 0 })
    const updated = (await getPlanById(plan.id))!
    expect(updated.status).toBe('active')
    expect(updated.firstSellCompleted).toBe(true)
  })

  it('after first sell, recordDailyEntry still succeeds', async () => {
    const plan = await createPlan('AAPL', 4000)
    for (let i = 0; i < 25; i++) {
      const date = `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      await recordDailyEntry(plan.id, { date, quantity: 1, price: 100, fee: 0 })
    }
    await recordSell(plan.id, { date: '2024-02-28', quantity: 12, price: 105, fee: 0 })
    await expect(
      recordDailyEntry(plan.id, { date: '2024-03-01', quantity: 1, price: 100, fee: 0 })
    ).resolves.not.toThrow()
  })

  it('second sell → plan status completed', async () => {
    const plan = await createPlan('AAPL', 4000)
    for (let i = 0; i < 25; i++) {
      const date = `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      await recordDailyEntry(plan.id, { date, quantity: 1, price: 100, fee: 0 })
    }
    await recordSell(plan.id, { date: '2024-02-28', quantity: 12, price: 105, fee: 0 })
    await recordSell(plan.id, { date: '2024-03-15', quantity: 13, price: 110, fee: 0 })
    const updated = (await getPlanById(plan.id))!
    expect(updated.status).toBe('completed')
  })

  it('oversell → throws error, plan unchanged', async () => {
    const plan = await createPlan('AAPL', 4000)
    await recordDailyEntry(plan.id, { date: '2024-01-01', quantity: 10, price: 100, fee: 0 })
    await expect(
      recordSell(plan.id, { date: '2024-01-15', quantity: 11, price: 110, fee: 0 })
    ).rejects.toThrow('매도 수량이 보유 수량을 초과합니다.')
    const unchanged = (await getPlanById(plan.id))!
    expect(unchanged.status).toBe('active')
    expect(unchanged.holdingQty).toBe(10)
  })
})
