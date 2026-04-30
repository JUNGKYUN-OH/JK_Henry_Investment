import { createClient, type Client } from '@libsql/client'

declare global {
  var __db: Client | undefined
}

export async function initSchema(db: Client): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS tickers (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        ticker_id TEXT NOT NULL REFERENCES tickers(id),
        total_amount REAL NOT NULL CHECK (total_amount > 0),
        daily_amount REAL NOT NULL CHECK (daily_amount > 0),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
        start_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        ticker_id TEXT NOT NULL REFERENCES tickers(id),
        type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
        date TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        price REAL NOT NULL CHECK (price > 0),
        fee REAL NOT NULL DEFAULT 0 CHECK (fee >= 0),
        plan_id TEXT REFERENCES plans(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS price_cache (
        ticker_id TEXT PRIMARY KEY REFERENCES tickers(id),
        price REAL NOT NULL,
        fetched_at TEXT NOT NULL
      )`,
    ],
    'write'
  )
}

export function getDb(): Client {
  if (!global.__db) {
    global.__db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return global.__db
}

export function setDb(db: Client): void {
  global.__db = db
}
