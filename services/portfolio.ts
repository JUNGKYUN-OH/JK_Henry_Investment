import { getDb } from '@/lib/db'
import type { Holding, ClosedPosition, PortfolioSummary } from '@/types'

interface BuyRow {
  ticker_id: string
  total_buy_qty: number
  total_buy_amount: number
}

interface SellRow {
  ticker_id: string
  total_sell_qty: number
  total_sell_amount: number
}

interface FeeRow {
  ticker_id: string
  total_fee: number
}

export async function calcHoldings(): Promise<Holding[]> {
  const db = getDb()

  const { rows: buyRaw } = await db.execute(
    `SELECT ticker_id, SUM(quantity) as total_buy_qty, SUM(quantity * price) as total_buy_amount
     FROM transactions WHERE type = 'buy'
     GROUP BY ticker_id`
  )
  const buyRows = buyRaw as unknown as BuyRow[]

  const { rows: sellRaw } = await db.execute(
    `SELECT ticker_id, SUM(quantity) as total_sell_qty, SUM(quantity * price) as total_sell_amount
     FROM transactions WHERE type = 'sell'
     GROUP BY ticker_id`
  )
  const sellRows = sellRaw as unknown as SellRow[]

  const { rows: feeRaw } = await db.execute(
    `SELECT ticker_id, SUM(fee) as total_fee FROM transactions GROUP BY ticker_id`
  )
  const feeRows = feeRaw as unknown as FeeRow[]

  const { rows: priceRaw } = await db.execute(
    'SELECT ticker_id, price FROM price_cache'
  )
  const priceRows = priceRaw as unknown as { ticker_id: string; price: number }[]

  const sellMap = new Map(sellRows.map((r) => [r.ticker_id, r]))
  const feeMap = new Map(feeRows.map((r) => [r.ticker_id, r.total_fee]))
  const priceMap = new Map(priceRows.map((r) => [r.ticker_id, r.price]))

  return buyRows.map((buy): Holding => {
    const avgCost = buy.total_buy_amount / buy.total_buy_qty
    const sell = sellMap.get(buy.ticker_id)
    const totalSellQty = sell?.total_sell_qty ?? 0
    const totalSellAmount = sell?.total_sell_amount ?? 0
    const quantity = buy.total_buy_qty - totalSellQty
    const realizedPnl = totalSellAmount - avgCost * totalSellQty
    const totalFee = feeMap.get(buy.ticker_id) ?? 0
    const currentPrice = priceMap.get(buy.ticker_id) ?? null
    const marketValue = currentPrice != null ? currentPrice * quantity : null
    const unrealizedPnl =
      currentPrice != null ? (currentPrice - avgCost) * quantity : null
    const unrealizedPnlPct =
      unrealizedPnl != null && avgCost > 0
        ? (unrealizedPnl / (avgCost * quantity)) * 100
        : null

    return {
      tickerId: buy.ticker_id,
      quantity,
      avgCost,
      totalCost: avgCost * quantity,
      currentPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct,
      realizedPnl,
      totalFee,
    }
  })
}

export async function calcActiveHoldings(): Promise<Holding[]> {
  return (await calcHoldings()).filter((h) => h.quantity > 0)
}

export async function calcClosedPositions(): Promise<ClosedPosition[]> {
  return (await calcHoldings())
    .filter((h) => h.quantity === 0)
    .map((h) => ({ tickerId: h.tickerId, realizedPnl: h.realizedPnl, totalFee: h.totalFee }))
}

export async function calcCurrentQuantity(tickerId: string): Promise<number> {
  const db = getDb()
  const { rows: buyRaw } = await db.execute({
    sql: `SELECT COALESCE(SUM(quantity), 0) as qty FROM transactions WHERE ticker_id = ? AND type = 'buy'`,
    args: [tickerId],
  })
  const { rows: sellRaw } = await db.execute({
    sql: `SELECT COALESCE(SUM(quantity), 0) as qty FROM transactions WHERE ticker_id = ? AND type = 'sell'`,
    args: [tickerId],
  })
  const buyQty = (buyRaw[0] as unknown as { qty: number }).qty
  const sellQty = (sellRaw[0] as unknown as { qty: number }).qty
  return buyQty - sellQty
}

export async function calcPortfolioSummary(): Promise<PortfolioSummary> {
  const all = await calcHoldings()
  const holdings = all.filter((h) => h.quantity > 0)
  const closed = all
    .filter((h) => h.quantity === 0)
    .map((h) => ({ tickerId: h.tickerId, realizedPnl: h.realizedPnl, totalFee: h.totalFee }))

  const totalCost = holdings.reduce((acc, h) => acc + h.totalCost, 0)
  const marketValue = holdings.some((h) => h.marketValue !== null)
    ? holdings.reduce((acc, h) => acc + (h.marketValue ?? h.totalCost), 0)
    : null
  const unrealizedPnl =
    marketValue !== null ? marketValue - totalCost : null
  const realizedPnl =
    holdings.reduce((acc, h) => acc + h.realizedPnl, 0) +
    closed.reduce((acc, c) => acc + c.realizedPnl, 0)
  const totalFee =
    holdings.reduce((acc, h) => acc + h.totalFee, 0) +
    closed.reduce((acc, c) => acc + c.totalFee, 0)

  return { totalCost, marketValue, unrealizedPnl, realizedPnl, totalFee }
}
