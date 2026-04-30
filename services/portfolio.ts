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

export function calcHoldings(): Holding[] {
  const db = getDb()

  const buyRows = db
    .prepare(
      `SELECT ticker_id, SUM(quantity) as total_buy_qty, SUM(quantity * price) as total_buy_amount
       FROM transactions WHERE type = 'buy'
       GROUP BY ticker_id`
    )
    .all() as BuyRow[]

  const sellRows = db
    .prepare(
      `SELECT ticker_id, SUM(quantity) as total_sell_qty, SUM(quantity * price) as total_sell_amount
       FROM transactions WHERE type = 'sell'
       GROUP BY ticker_id`
    )
    .all() as SellRow[]

  const feeRows = db
    .prepare(
      `SELECT ticker_id, SUM(fee) as total_fee FROM transactions GROUP BY ticker_id`
    )
    .all() as FeeRow[]

  const priceRows = db
    .prepare('SELECT ticker_id, price FROM price_cache')
    .all() as { ticker_id: string; price: number }[]

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

export function calcActiveHoldings(): Holding[] {
  return calcHoldings().filter((h) => h.quantity > 0)
}

export function calcClosedPositions(): ClosedPosition[] {
  return calcHoldings()
    .filter((h) => h.quantity === 0)
    .map((h) => ({ tickerId: h.tickerId, realizedPnl: h.realizedPnl, totalFee: h.totalFee }))
}

export function calcCurrentQuantity(tickerId: string): number {
  const db = getDb()
  const buyRow = db
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) as qty FROM transactions WHERE ticker_id = ? AND type = 'buy'`
    )
    .get(tickerId) as { qty: number }
  const sellRow = db
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) as qty FROM transactions WHERE ticker_id = ? AND type = 'sell'`
    )
    .get(tickerId) as { qty: number }
  return buyRow.qty - sellRow.qty
}

export function calcPortfolioSummary(): PortfolioSummary {
  const holdings = calcActiveHoldings()
  const closed = calcClosedPositions()

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
