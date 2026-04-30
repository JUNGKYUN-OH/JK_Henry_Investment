import { beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { setDb, initSchema } from '@/lib/db'
import { addTicker } from './ticker'
import { createTransaction } from './transaction'
import {
  calcHoldings,
  calcActiveHoldings,
  calcCurrentQuantity,
  calcPortfolioSummary,
} from './portfolio'

beforeEach(() => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  setDb(db)
  addTicker('SPY')
})

describe('calcHoldings — buy only', () => {
  it('S2: 10주 @ $450 → avgCost $450, qty 10, totalCost $4500', () => {
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 2.5 })
    const [holding] = calcActiveHoldings()
    expect(holding.tickerId).toBe('SPY')
    expect(holding.quantity).toBe(10)
    expect(holding.avgCost).toBeCloseTo(450, 4)
    expect(holding.totalCost).toBeCloseTo(4500, 4)
  })

  it('S3: 10주 @ $450 + 10주 @ $430 → avgCost $440, qty 20, totalCost $8800', () => {
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-16', quantity: 10, price: 430, fee: 0 })
    const [holding] = calcActiveHoldings()
    expect(holding.quantity).toBe(20)
    expect(holding.avgCost).toBeCloseTo(440, 4)
    expect(holding.totalCost).toBeCloseTo(8800, 4)
  })
})

describe('calcPortfolioSummary', () => {
  it('S2: 총 수수료가 별도 항목으로 표시된다 — $2.50', () => {
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 2.5 })
    const summary = calcPortfolioSummary()
    expect(summary.totalFee).toBeCloseTo(2.5, 4)
    expect(summary.totalCost).toBeCloseTo(4500, 4)
  })
})

describe('calcCurrentQuantity', () => {
  it('returns 0 when no transactions', () => {
    expect(calcCurrentQuantity('SPY')).toBe(0)
  })

  it('returns net quantity after buys', () => {
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    expect(calcCurrentQuantity('SPY')).toBe(10)
  })
})
