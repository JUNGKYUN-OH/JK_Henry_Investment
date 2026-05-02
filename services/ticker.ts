import { getDb } from '@/lib/db'
import type { Ticker } from '@/types'

export interface TickerWithCount extends Ticker {
  planCount: number
}

function rowToTicker(row: { id: string; created_at: string }): Ticker {
  return { id: row.id, createdAt: row.created_at }
}

export async function getAllTickers(): Promise<Ticker[]> {
  const { rows } = await getDb().execute('SELECT id, created_at FROM tickers ORDER BY id')
  return (rows as unknown as { id: string; created_at: string }[]).map(rowToTicker)
}

export async function getAllTickersWithCounts(): Promise<TickerWithCount[]> {
  const { rows } = await getDb().execute(
    `SELECT t.id, t.created_at, COUNT(p.id) as plan_count
     FROM tickers t
     LEFT JOIN plans p ON t.id = p.ticker_id
     GROUP BY t.id
     ORDER BY t.id`
  )
  return (rows as unknown as { id: string; created_at: string; plan_count: number }[]).map(
    (row) => ({
      id: row.id,
      createdAt: row.created_at,
      planCount: Number(row.plan_count),
    })
  )
}

export async function tickerExists(id: string): Promise<boolean> {
  const { rows } = await getDb().execute({
    sql: 'SELECT 1 FROM tickers WHERE id = ? LIMIT 1',
    args: [id],
  })
  return rows.length > 0
}

export async function hasTransactions(tickerId: string): Promise<boolean> {
  const { rows } = await getDb().execute({
    sql: 'SELECT 1 FROM transactions WHERE ticker_id = ? LIMIT 1',
    args: [tickerId],
  })
  return rows.length > 0
}

export async function addTicker(id: string): Promise<void> {
  await getDb().execute({
    sql: 'INSERT INTO tickers (id) VALUES (?)',
    args: [id.toUpperCase().trim()],
  })
}

export async function deleteTicker(id: string): Promise<void> {
  await getDb().execute({
    sql: 'DELETE FROM tickers WHERE id = ?',
    args: [id],
  })
}
