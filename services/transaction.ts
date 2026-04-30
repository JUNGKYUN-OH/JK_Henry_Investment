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

export async function getTransactionsByPlanId(planId: string): Promise<Transaction[]> {
  const { rows } = await getDb().execute({
    sql: 'SELECT * FROM transactions WHERE plan_id = ? ORDER BY date DESC, created_at DESC',
    args: [planId],
  })
  return (rows as unknown as Parameters<typeof rowToTransaction>[0][]).map(rowToTransaction)
}

export async function getAllTransactions(tickerId?: string): Promise<Transaction[]> {
  const db = getDb()
  if (tickerId) {
    const { rows } = await db.execute({
      sql: 'SELECT * FROM transactions WHERE ticker_id = ? ORDER BY date DESC, created_at DESC',
      args: [tickerId],
    })
    return (rows as unknown as Parameters<typeof rowToTransaction>[0][]).map(rowToTransaction)
  }
  const { rows } = await db.execute(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
  )
  return (rows as unknown as Parameters<typeof rowToTransaction>[0][]).map(rowToTransaction)
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const { rows } = await getDb().execute({
    sql: 'SELECT * FROM transactions WHERE id = ?',
    args: [id],
  })
  const row = rows[0] as unknown as Parameters<typeof rowToTransaction>[0] | undefined
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

export async function createTransaction(data: CreateTransactionData): Promise<Transaction> {
  const id = crypto.randomUUID()
  await getDb().execute({
    sql: `INSERT INTO transactions (id, ticker_id, type, date, quantity, price, fee, plan_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.tickerId, data.type, data.date, data.quantity, data.price, data.fee, data.planId ?? null],
  })
  return (await getTransactionById(id))!
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<CreateTransactionData, 'tickerId' | 'planId'>>
): Promise<void> {
  const fields: string[] = []
  const values: (string | number)[] = []
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type) }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
  if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity) }
  if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price) }
  if (data.fee !== undefined) { fields.push('fee = ?'); values.push(data.fee) }
  if (fields.length === 0) return
  values.push(id)
  await getDb().execute({
    sql: `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  })
}

export async function deleteTransaction(id: string): Promise<void> {
  await getDb().execute({
    sql: 'DELETE FROM transactions WHERE id = ?',
    args: [id],
  })
}
