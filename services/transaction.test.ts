import { beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { setDb, initSchema } from '@/lib/db'
import { addTicker } from './ticker'
import { createTransaction, getAllTransactions, getTransactionById } from './transaction'

beforeEach(() => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  setDb(db)
  addTicker('SPY')
})

describe('createTransaction', () => {
  it('creates a buy transaction and returns it', () => {
    const tx = createTransaction({
      tickerId: 'SPY',
      type: 'buy',
      date: '2024-01-15',
      quantity: 10,
      price: 450,
      fee: 2.5,
    })
    expect(tx.tickerId).toBe('SPY')
    expect(tx.type).toBe('buy')
    expect(tx.quantity).toBe(10)
    expect(tx.price).toBe(450)
    expect(tx.fee).toBe(2.5)
    expect(tx.planId).toBeNull()
  })

  it('assigns a uuid id', () => {
    const tx = createTransaction({
      tickerId: 'SPY',
      type: 'buy',
      date: '2024-01-15',
      quantity: 10,
      price: 450,
      fee: 0,
    })
    expect(tx.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('getAllTransactions', () => {
  it('returns all transactions ordered by date desc', () => {
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-10', quantity: 5, price: 440, fee: 0 })
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 2.5 })
    const txs = getAllTransactions()
    expect(txs).toHaveLength(2)
    expect(txs[0].date).toBe('2024-01-15')
  })

  it('filters by tickerId', () => {
    addTicker('QQQ')
    createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    createTransaction({ tickerId: 'QQQ', type: 'buy', date: '2024-01-15', quantity: 5, price: 400, fee: 0 })
    expect(getAllTransactions('SPY')).toHaveLength(1)
    expect(getAllTransactions('QQQ')).toHaveLength(1)
  })
})

describe('getTransactionById', () => {
  it('returns null for unknown id', () => {
    expect(getTransactionById('nonexistent')).toBeNull()
  })

  it('returns the transaction after creation', () => {
    const tx = createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    expect(getTransactionById(tx.id)).toEqual(tx)
  })
})
