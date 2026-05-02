import { neon } from '@neondatabase/serverless'

// Services call execute({ sql, args }) — this interface keeps them unchanged.
export interface DbClient {
  execute(stmt: string | { sql: string; args?: unknown[] }): Promise<{ rows: Record<string, unknown>[] }>
  batch(stmts: (string | { sql: string })[], mode?: string): Promise<unknown>
}

declare global {
  var __db: DbClient | undefined
}

function createNeonClient(): DbClient {
  const neonFn = neon(process.env.DATABASE_URL!)
  return {
    async execute(stmt) {
      const query = typeof stmt === 'string' ? stmt : stmt.sql
      const args = (typeof stmt === 'string' ? [] : (stmt.args ?? [])) as unknown[]
      // Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
      let i = 0
      const pgQuery = query.replace(/\?/g, () => `$${++i}`)
      const rows = (await neonFn(pgQuery, args)) as Record<string, unknown>[]
      return { rows }
    },
    async batch(stmts) {
      for (const s of stmts) {
        const query = typeof s === 'string' ? s : s.sql
        await neonFn(query, [])
      }
    },
  }
}

export function getDb(): DbClient {
  if (!global.__db) {
    global.__db = createNeonClient()
  }
  return global.__db
}

export function setDb(db: DbClient): void {
  global.__db = db
}

// Used only in test setup — SQLite syntax via @libsql/client :memory:
export async function initSchema(db: DbClient): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS tickers (
        id TEXT PRIMARY KEY,
        name TEXT,
        exchange TEXT,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        ticker_id TEXT NOT NULL REFERENCES tickers(id),
        total_amount REAL NOT NULL CHECK (total_amount > 0),
        daily_amount REAL NOT NULL CHECK (daily_amount > 0),
        splits INTEGER NOT NULL DEFAULT 40,
        target_return REAL NOT NULL DEFAULT 0.10,
        fee_rate REAL NOT NULL DEFAULT 0.0025,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
        start_date TEXT NOT NULL,
        completed_at TEXT,
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
      `CREATE TABLE IF NOT EXISTS plan_daily_skips (
        plan_id TEXT NOT NULL REFERENCES plans(id),
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
        PRIMARY KEY (plan_id, date, type)
      )`,
    ],
    'write'
  )
}
