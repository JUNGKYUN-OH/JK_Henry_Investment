import { beforeEach, describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { setDb, initSchema } from '@/lib/db'
import { addTicker } from './ticker'
import { createTransaction, getAllTransactions, getTransactionById } from './transaction'

beforeEach(async () => {
  const db = createClient({ url: ':memory:' })
  await initSchema(db)
  setDb(db)
  await addTicker('SPY')
})

describe('createTransaction', () => {
  it('creates a buy transaction and returns it', async () => {
    const tx = await createTransaction({
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

  it('assigns a uuid id', async () => {
    const tx = await createTransaction({
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
  it('returns all transactions ordered by date desc', async () => {
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-10', quantity: 5, price: 440, fee: 0 })
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 2.5 })
    const txs = await getAllTransactions()
    expect(txs).toHaveLength(2)
    expect(txs[0].date).toBe('2024-01-15')
  })

  it('filters by tickerId', async () => {
    await addTicker('QQQ')
    await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    await createTransaction({ tickerId: 'QQQ', type: 'buy', date: '2024-01-15', quantity: 5, price: 400, fee: 0 })
    expect(await getAllTransactions('SPY')).toHaveLength(1)
    expect(await getAllTransactions('QQQ')).toHaveLength(1)
  })
})

describe('getTransactionById', () => {
  it('returns null for unknown id', async () => {
    expect(await getTransactionById('nonexistent')).toBeNull()
  })

  it('returns the transaction after creation', async () => {
    const tx = await createTransaction({ tickerId: 'SPY', type: 'buy', date: '2024-01-15', quantity: 10, price: 450, fee: 0 })
    expect(await getTransactionById(tx.id)).toEqual(tx)
  })
})
