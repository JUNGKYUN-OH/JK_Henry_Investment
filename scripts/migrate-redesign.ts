/**
 * One-time migration: add splits and target_return columns to plans table.
 * Run before deploying the redesign feature.
 *
 * Usage: bun run scripts/migrate-redesign.ts
 */
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  console.log('Running redesign migration...')
  await sql`ALTER TABLE plans ADD COLUMN IF NOT EXISTS splits INTEGER NOT NULL DEFAULT 40`
  await sql`ALTER TABLE plans ADD COLUMN IF NOT EXISTS target_return REAL NOT NULL DEFAULT 0.10`
  console.log('Migration complete.')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
