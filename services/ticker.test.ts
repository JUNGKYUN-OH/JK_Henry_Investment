import { beforeEach, describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { setDb, initSchema, type DbClient } from '@/lib/db'
import {
  getAllTickers,
  getAllTickersWithCounts,
  addTicker,
  deleteTicker,
  tickerExists,
  hasTransactions,
} from './ticker'

beforeEach(async () => {
  const db = createClient({ url: ':memory:' })
  await initSchema(db as unknown as DbClient)
  setDb(db as unknown as DbClient)
})

describe('addTicker', () => {
  it('adds a ticker that appears in getAllTickers', async () => {
    await addTicker('SPY')
    const tickers = await getAllTickers()
    expect(tickers).toHaveLength(1)
    expect(tickers[0].id).toBe('SPY')
  })

  it('normalizes input to uppercase', async () => {
    await addTicker('spy')
    expect((await getAllTickers())[0].id).toBe('SPY')
  })

  it('throws on duplicate ticker', async () => {
    await addTicker('SPY')
    await expect(addTicker('SPY')).rejects.toThrow()
  })
})

describe('tickerExists', () => {
  it('returns false when not registered', async () => {
    expect(await tickerExists('SPY')).toBe(false)
  })

  it('returns true after registration', async () => {
    await addTicker('SPY')
    expect(await tickerExists('SPY')).toBe(true)
  })
})

describe('deleteTicker', () => {
  it('removes the ticker', async () => {
    await addTicker('SPY')
    await deleteTicker('SPY')
    expect(await getAllTickers()).toHaveLength(0)
  })
})

describe('hasTransactions', () => {
  it('returns false when no transactions exist for ticker', async () => {
    await addTicker('SPY')
    expect(await hasTransactions('SPY')).toBe(false)
  })
})

describe('getAllTickersWithCounts', () => {
  it('returns tickers with transactionCount 0 when no trades', async () => {
    await addTicker('SPY')
    await addTicker('QQQ')
    const tickers = await getAllTickersWithCounts()
    expect(tickers).toHaveLength(2)
    expect(tickers.every((t) => t.transactionCount === 0)).toBe(true)
  })
})
