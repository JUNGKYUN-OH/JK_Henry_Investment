import { getDb } from '@/lib/db'
import type { Ticker } from '@/types'

export interface TickerWithCount extends Ticker {
  transactionCount: number
}

function rowToTicker(row: { id: string; created_at: string }): Ticker {
  return { id: row.id, createdAt: row.created_at }
}

export function getAllTickers(): Ticker[] {
  return (
    getDb()
      .prepare('SELECT id, created_at FROM tickers ORDER BY id')
      .all() as { id: string; created_at: string }[]
  ).map(rowToTicker)
}

export function getAllTickersWithCounts(): TickerWithCount[] {
  return (
    getDb()
      .prepare(
        `SELECT t.id, t.created_at, COUNT(tx.id) as transaction_count
         FROM tickers t
         LEFT JOIN transactions tx ON t.id = tx.ticker_id
         GROUP BY t.id
         ORDER BY t.id`
      )
      .all() as { id: string; created_at: string; transaction_count: number }[]
  ).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    transactionCount: row.transaction_count,
  }))
}

export function tickerExists(id: string): boolean {
  return !!getDb().prepare('SELECT 1 FROM tickers WHERE id = ? LIMIT 1').get(id)
}

export function hasTransactions(tickerId: string): boolean {
  return !!getDb()
    .prepare('SELECT 1 FROM transactions WHERE ticker_id = ? LIMIT 1')
    .get(tickerId)
}

export function addTicker(id: string): void {
  getDb()
    .prepare('INSERT INTO tickers (id) VALUES (?)')
    .run(id.toUpperCase().trim())
}

export function deleteTicker(id: string): void {
  getDb().prepare('DELETE FROM tickers WHERE id = ?').run(id)
}
