import { getDb } from '@/lib/db'
import type { Transaction } from '@/types'

function rowToTransaction(row: {
  id: string
  ticker_id: string
  type: 'buy' | 'sell'
  date: string
  quantity: number
  price: number
  fee: number
  plan_id: string | null
  created_at: string
}): Transaction {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    type: row.type,
    date: row.date,
    quantity: row.quantity,
    price: row.price,
    fee: row.fee,
    planId: row.plan_id,
    createdAt: row.created_at,
  }
}

export function getTransactionsByPlanId(planId: string): Transaction[] {
  return (
    getDb()
      .prepare(
        'SELECT * FROM transactions WHERE plan_id = ? ORDER BY date DESC, created_at DESC'
      )
      .all(planId) as Parameters<typeof rowToTransaction>[0][]
  ).map(rowToTransaction)
}

export function getAllTransactions(tickerId?: string): Transaction[] {
  const db = getDb()
  if (tickerId) {
    return (
      db
        .prepare(
          'SELECT * FROM transactions WHERE ticker_id = ? ORDER BY date DESC, created_at DESC'
        )
        .all(tickerId) as Parameters<typeof rowToTransaction>[0][]
    ).map(rowToTransaction)
  }
  return (
    db
      .prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC')
      .all() as Parameters<typeof rowToTransaction>[0][]
  ).map(rowToTransaction)
}

export function getTransactionById(id: string): Transaction | null {
  const row = getDb()
    .prepare('SELECT * FROM transactions WHERE id = ?')
    .get(id) as Parameters<typeof rowToTransaction>[0] | undefined
  return row ? rowToTransaction(row) : null
}

export interface CreateTransactionData {
  tickerId: string
  type: 'buy' | 'sell'
  date: string
  quantity: number
  price: number
  fee: number
  planId?: string
}

export function createTransaction(data: CreateTransactionData): Transaction {
  const id = crypto.randomUUID()
  getDb()
    .prepare(
      `INSERT INTO transactions (id, ticker_id, type, date, quantity, price, fee, plan_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, data.tickerId, data.type, data.date, data.quantity, data.price, data.fee, data.planId ?? null)
  return getTransactionById(id)!
}

export function updateTransaction(
  id: string,
  data: Partial<Omit<CreateTransactionData, 'tickerId' | 'planId'>>
): void {
  const fields: string[] = []
  const values: (string | number)[] = []
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type) }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
  if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity) }
  if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price) }
  if (data.fee !== undefined) { fields.push('fee = ?'); values.push(data.fee) }
  if (fields.length === 0) return
  values.push(id)
  getDb()
    .prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values)
}

export function deleteTransaction(id: string): void {
  getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id)
}
