import { getDb } from '@/lib/db'

export interface PriceFetchResult {
  tickerId: string
  price: number | null
  error?: string
}

export async function fetchAndCachePrices(
  tickerIds: string[]
): Promise<{ results: PriceFetchResult[]; anyError: boolean }> {
  if (tickerIds.length === 0) return { results: [], anyError: false }

  // yahoo-finance2 v3 requires instantiation; default export is the class, not a singleton
  const YahooFinance = (await import('yahoo-finance2')).default
  const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] } as never)
  const results: PriceFetchResult[] = []
  let anyError = false

  await Promise.all(
    tickerIds.map(async (tickerId) => {
      try {
        const quote = await yf.quote(tickerId, { fields: ['regularMarketPrice'] })
        const price = (quote as { regularMarketPrice?: number }).regularMarketPrice ?? null
        if (price == null) throw new Error('No price data')

        getDb()
          .prepare(
            `INSERT INTO price_cache (ticker_id, price, fetched_at)
             VALUES (?, ?, ?)
             ON CONFLICT(ticker_id) DO UPDATE SET price = excluded.price, fetched_at = excluded.fetched_at`
          )
          .run(tickerId, price, new Date().toISOString())

        results.push({ tickerId, price })
      } catch (err) {
        anyError = true
        const existing = getDb()
          .prepare('SELECT price FROM price_cache WHERE ticker_id = ?')
          .get(tickerId) as { price: number } | undefined
        results.push({
          tickerId,
          price: existing?.price ?? null,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    })
  )

  return { results, anyError }
}

export function getCachedPrices(): Map<string, { price: number; fetchedAt: string }> {
  const rows = getDb()
    .prepare('SELECT ticker_id, price, fetched_at FROM price_cache')
    .all() as { ticker_id: string; price: number; fetched_at: string }[]
  return new Map(rows.map((r) => [r.ticker_id, { price: r.price, fetchedAt: r.fetched_at }]))
}

export function upsertManualPrice(tickerId: string, price: number): void {
  getDb()
    .prepare(
      `INSERT INTO price_cache (ticker_id, price, fetched_at)
       VALUES (?, ?, ?)
       ON CONFLICT(ticker_id) DO UPDATE SET price = excluded.price, fetched_at = excluded.fetched_at`
    )
    .run(tickerId, price, new Date().toISOString())
}
