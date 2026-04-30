import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'henry-ledger.db')

declare global {
   
  var __db: Database.Database | undefined
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickers (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      ticker_id TEXT NOT NULL REFERENCES tickers(id),
      total_amount REAL NOT NULL CHECK (total_amount > 0),
      daily_amount REAL NOT NULL CHECK (daily_amount > 0),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
      start_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      ticker_id TEXT NOT NULL REFERENCES tickers(id),
      type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
      date TEXT NOT NULL,
      quantity REAL NOT NULL CHECK (quantity > 0),
      price REAL NOT NULL CHECK (price > 0),
      fee REAL NOT NULL DEFAULT 0 CHECK (fee >= 0),
      plan_id TEXT REFERENCES plans(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_cache (
      ticker_id TEXT PRIMARY KEY REFERENCES tickers(id),
      price REAL NOT NULL,
      fetched_at TEXT NOT NULL
    );
  `)
}

export function getDb(): Database.Database {
  if (!global.__db) {
    global.__db = new Database(DB_PATH)
    global.__db.pragma('journal_mode = WAL')
    global.__db.pragma('foreign_keys = ON')
    initSchema(global.__db)
  }
  return global.__db
}

export function setDb(db: Database.Database): void {
  global.__db = db
}
