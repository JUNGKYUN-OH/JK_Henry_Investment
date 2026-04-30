import { beforeEach, describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { setDb, initSchema, type DbClient } from '@/lib/db'
import { addTicker } from './ticker'
import { createTransaction } from './transaction'
import {
  calcActiveHoldings,
  calcClosedPositions,
  calcCurrentQuantity,
  calcPortfolioSummary,
} from './portfolio'

beforeEach(async () => {
  const db = createClient({ url: ':memory:' })
  await initSchema(db as unknown as DbClient)
  setDb(db as unknown as DbClient)
  await addTicker('SPY')
})

describe('calcHoldings — buy only', () => {
  it('S2: 10주 @ $450 → avgCost $450, qty 10, totalCost $4500', async () => {
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 2.5 })
    const [holding] = await calcActiveHoldings()
    expect(holding.tickerId).toBe('SPY')
    expect(holding.quantity).toBe(10)
    expect(holding.avgCost).toBeCloseTo(450, 4)
    expect(holding.totalCost).toBeCloseTo(4500, 4)
  })

  it('S3: 10주 @ $450 + 10주 @ $430 → avgCost $440, qty 20, totalCost $8800', async () => {
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-16', quantity: 10, price: 430, fee: 0 })
    const [holding] = await calcActiveHoldings()
    expect(holding.quantity).toBe(20)
    expect(holding.avgCost).toBeCloseTo(440, 4)
    expect(holding.totalCost).toBeCloseTo(8800, 4)
  })
})

describe('calcPortfolioSummary', () => {
  it('S2: 총 수수료가 별도 항목으로 표시된다 — $2.50', async () => {
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 2.5 })
    const summary = await calcPortfolioSummary()
    expect(summary.totalFee).toBeCloseTo(2.5, 4)
    expect(summary.totalCost).toBeCloseTo(4500, 4)
  })
})

describe('calcHoldings — with sells', () => {
  it('S4: 10주 @ $450 매수 후 5주 @ $480 매도 → 보유 5주, 실현손익 +$150', async () => {
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    await createTransaction({ tickerId: 'SPY', type: 'sell', date: '2024-01-20', quantity: 5, price: 480, fee: 0 })
    const [holding] = await calcActiveHoldings()
    expect(holding.quantity).toBe(5)
    expect(holding.realizedPnl).toBeCloseTo(150, 4)
  })

  it('S5: 전량 매도 후 보유 중에 없고 매도 완료에 있다', async () => {
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    await createTransaction({ tickerId: 'SPY', type: 'sell', date: '2024-01-20', quantity: 10, price: 480, fee: 0 })
    expect(await calcActiveHoldings()).toHaveLength(0)
    const closed = await calcClosedPositions()
    expect(closed).toHaveLength(1)
    expect(closed[0].tickerId).toBe('SPY')
    expect(closed[0].realizedPnl).toBeCloseTo(300, 4)
  })
})

describe('calcCurrentQuantity', () => {
  it('returns 0 when no transactions', async () => {
    expect(await calcCurrentQuantity('SPY')).toBe(0)
  })

  it('returns net quantity after buys', async () => {
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    expect(await calcCurrentQuantity('SPY')).toBe(10)
  })
})
