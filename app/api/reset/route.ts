import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migrate-secret')
  if (!process.env.MIGRATE_SECRET || secret !== process.env.MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getDb()
    // Delete in FK-safe order
    await db.execute('DELETE FROM plan_daily_skips')
    await db.execute('DELETE FROM transactions')
    await db.execute('DELETE FROM price_cache')
    await db.execute('DELETE FROM plans')
    await db.execute('DELETE FROM tickers')
    return NextResponse.json({ ok: true, message: 'All data cleared' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
