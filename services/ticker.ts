import { getDb } from '@/lib/db'
import type { Ticker } from '@/types'

export interface TickerWithCount extends Ticker {
  name: string | null
  exchange: string | null
  description: string | null
  activePlanCount: number
  completedPlanCount: number
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
    `SELECT t.id, t.name, t.exchange, t.description, t.created_at,
       COUNT(CASE WHEN p.status = 'active' THEN 1 END) AS active_plan_count,
       COUNT(CASE WHEN p.status = 'completed' THEN 1 END) AS completed_plan_count
     FROM tickers t
     LEFT JOIN plans p ON t.id = p.ticker_id
     GROUP BY t.id
     ORDER BY t.id`
  )
  return (rows as unknown as {
    id: string; name: string | null; exchange: string | null; description: string | null
    created_at: string; active_plan_count: number; completed_plan_count: number
  }[]).map((row) => ({
    id: row.id,
    name: row.name ?? null,
    exchange: row.exchange ?? null,
    description: row.description ?? null,
    createdAt: row.created_at,
    activePlanCount: Number(row.active_plan_count),
    completedPlanCount: Number(row.completed_plan_count),
  }))
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

export async function addTicker(
  id: string,
  info?: { name?: string | null; exchange?: string | null; description?: string | null }
): Promise<void> {
  await getDb().execute({
    sql: 'INSERT INTO tickers (id, name, exchange, description) VALUES (?, ?, ?, ?)',
    args: [id.toUpperCase().trim(), info?.name ?? null, info?.exchange ?? null, info?.description ?? null],
  })
}

export async function deleteTicker(id: string): Promise<void> {
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM price_cache WHERE ticker_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM tickers WHERE id = ?', args: [id] })
}
