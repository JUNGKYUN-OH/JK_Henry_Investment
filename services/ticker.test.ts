import { beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { setDb, initSchema } from '@/lib/db'
import {
  getAllTickers,
  getAllTickersWithCounts,
  addTicker,
  deleteTicker,
  tickerExists,
  hasTransactions,
} from './ticker'

beforeEach(() => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  setDb(db)
})

describe('addTicker', () => {
  it('adds a ticker that appears in getAllTickers', () => {
    addTicker('SPY')
    const tickers = getAllTickers()
    expect(tickers).toHaveLength(1)
    expect(tickers[0].id).toBe('SPY')
  })

  it('normalizes input to uppercase', () => {
    addTicker('spy')
    expect(getAllTickers()[0].id).toBe('SPY')
  })

  it('throws on duplicate ticker', () => {
    addTicker('SPY')
    expect(() => addTicker('SPY')).toThrow()
  })
})

describe('tickerExists', () => {
  it('returns false when not registered', () => {
    expect(tickerExists('SPY')).toBe(false)
  })

  it('returns true after registration', () => {
    addTicker('SPY')
    expect(tickerExists('SPY')).toBe(true)
  })
})

describe('deleteTicker', () => {
  it('removes the ticker', () => {
    addTicker('SPY')
    deleteTicker('SPY')
    expect(getAllTickers()).toHaveLength(0)
  })
})

describe('hasTransactions', () => {
  it('returns false when no transactions exist for ticker', () => {
    addTicker('SPY')
    expect(hasTransactions('SPY')).toBe(false)
  })
})

describe('getAllTickersWithCounts', () => {
  it('returns tickers with transactionCount 0 when no trades', () => {
    addTicker('SPY')
    addTicker('QQQ')
    const tickers = getAllTickersWithCounts()
    expect(tickers).toHaveLength(2)
    expect(tickers.every((t) => t.transactionCount === 0)).toBe(true)
  })
})
