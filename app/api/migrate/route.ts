import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migrate-secret')
  if (!process.env.MIGRATE_SECRET || secret !== process.env.MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getDb()
    await db.batch([
      `CREATE TABLE IF NOT EXISTS tickers (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        ticker_id TEXT NOT NULL REFERENCES tickers(id),
        total_amount REAL NOT NULL CHECK (total_amount > 0),
        daily_amount REAL NOT NULL CHECK (daily_amount > 0),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
        start_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
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
        created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS price_cache (
        ticker_id TEXT PRIMARY KEY REFERENCES tickers(id),
        price REAL NOT NULL,
        fetched_at TEXT NOT NULL
      )`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS splits INTEGER NOT NULL DEFAULT 40`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS target_return REAL NOT NULL DEFAULT 0.10`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS fee_rate REAL NOT NULL DEFAULT 0.0025`,
      `CREATE TABLE IF NOT EXISTS plan_daily_skips (
        plan_id TEXT NOT NULL REFERENCES plans(id),
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
        PRIMARY KEY (plan_id, date, type)
      )`,
      `ALTER TABLE tickers ADD COLUMN IF NOT EXISTS name TEXT`,
      `ALTER TABLE tickers ADD COLUMN IF NOT EXISTS exchange TEXT`,
      `ALTER TABLE tickers ADD COLUMN IF NOT EXISTS description TEXT`,
    ])
    return NextResponse.json({ ok: true, message: 'Schema migrated successfully' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
