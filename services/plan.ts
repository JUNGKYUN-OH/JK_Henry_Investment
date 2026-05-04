import { getDb } from '@/lib/db'
import type { Plan, PlanWithProgress } from '@/types'
import { createTransaction } from './transaction'
export { computeSellSignal } from '@/lib/sellSignal'

function rowToPlan(row: {
  id: string
  ticker_id: string
  total_amount: number
  daily_amount: number
  splits: number
  target_return: number
  fee_rate: number
  status: 'active' | 'completed'
  start_date: string
  completed_at: string | null
  created_at: string
}): Plan {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    totalAmount: row.total_amount,
    dailyAmount: row.daily_amount,
    splits: row.splits ?? 40,
    targetReturn: row.target_return ?? 0.1,
    feeRate: row.fee_rate ?? 0,
    status: row.status,
    startDate: row.start_date,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
  }
}

async function calcPlanProgress(
  planId: string,
  tickerId: string,
  totalAmount: number,
  splits: number,
  targetReturn: number
) {
  const db = getDb()

  const { rows: cntRows } = await db.execute({
    sql: `SELECT COUNT(*) AS cnt FROM transactions WHERE plan_id = ? AND type = 'buy'`,
    args: [planId],
  })
  const completedDays = Number((cntRows[0] as unknown as { cnt: number | bigint }).cnt)

  const { rows: allBuyRows } = await db.execute({
    sql: `SELECT quantity, price FROM transactions WHERE plan_id = ? AND type = 'buy'`,
    args: [planId],
  })
  const buyRows = allBuyRows as unknown as { quantity: number; price: number }[]

  const totalSpent = buyRows.reduce((sum, r) => sum + r.quantity * r.price, 0)
  const totalBuyQty = buyRows.reduce((sum, r) => sum + r.quantity, 0)
  const remainingAmount = Math.max(0, totalAmount - totalSpent)
  const planAvgCost = totalBuyQty > 0 ? totalSpent / totalBuyQty : null
  const targetSellPrice = planAvgCost != null ? planAvgCost * (1 + targetReturn) : null

  const { rows: sellRows } = await db.execute({
    sql: `SELECT COUNT(*) AS cnt,
                 COALESCE(SUM(quantity), 0) AS sell_qty,
                 COALESCE(SUM(quantity * price), 0) AS sell_proceeds,
                 COALESCE(SUM(fee), 0) AS sell_fees
          FROM transactions WHERE plan_id = ? AND type = 'sell'`,
    args: [planId],
  })
  const sellRow = sellRows[0] as unknown as { cnt: number | bigint; sell_qty: number; sell_proceeds: number; sell_fees: number }
  const sellCount = Number(sellRow.cnt)
  const totalSellQty = Number(sellRow.sell_qty)
  const sellProceeds = Number(sellRow.sell_proceeds)
  const sellFees = Number(sellRow.sell_fees)
  const holdingQty = Math.max(0, totalBuyQty - totalSellQty)
  const dailyAmount = totalAmount / splits
  const completedSplits = dailyAmount > 0 ? Math.round(totalSpent / dailyAmount) : 0
  const firstSellCompleted = completedSplits > splits / 2 && sellCount >= 1
  const realizedPnl = planAvgCost != null && totalSellQty > 0
    ? (sellProceeds - sellFees) - planAvgCost * totalSellQty
    : null

  return { completedDays, completedSplits, remainingAmount, planAvgCost, targetSellPrice, firstSellCompleted, holdingQty, realizedPnl }
}

export async function getAllPlans(): Promise<PlanWithProgress[]> {
  const db = getDb()
  const { rows } = await db.execute('SELECT * FROM plans ORDER BY created_at DESC')
  const planRows = rows as unknown as Parameters<typeof rowToPlan>[0][]

  if (planRows.length === 0) return []

  const planIds = planRows.map((r) => r.id)
  const dayPlaceholders = planIds.map(() => '?').join(',')
  const { rows: dayAggRows } = await db.execute({
    sql: `SELECT plan_id, COUNT(*) AS completed_days
          FROM transactions
          WHERE type = 'buy' AND plan_id IN (${dayPlaceholders})
          GROUP BY plan_id`,
    args: planIds,
  })
  const dayMap = new Map(
    (dayAggRows as unknown as { plan_id: string; completed_days: number | bigint }[]).map((r) => [
      r.plan_id,
      Number(r.completed_days),
    ])
  )

  const { rows: sellCntRows } = await db.execute({
    sql: `SELECT plan_id,
                 COUNT(*) AS sell_count,
                 COALESCE(SUM(quantity), 0) AS sell_qty,
                 COALESCE(SUM(quantity * price), 0) AS sell_proceeds,
                 COALESCE(SUM(fee), 0) AS sell_fees
          FROM transactions
          WHERE type = 'sell' AND plan_id IN (${dayPlaceholders})
          GROUP BY plan_id`,
    args: planIds,
  })
  const sellMap = new Map(
    (sellCntRows as unknown as { plan_id: string; sell_count: number | bigint; sell_qty: number; sell_proceeds: number; sell_fees: number }[]).map((r) => [
      r.plan_id,
      { count: Number(r.sell_count), qty: Number(r.sell_qty), proceeds: Number(r.sell_proceeds), fees: Number(r.sell_fees) },
    ])
  )

  const { rows: tickerAggRows } = await db.execute({
    sql: `SELECT plan_id,
                 SUM(quantity * price) AS total_spent,
                 SUM(quantity) AS total_buy_qty
          FROM transactions
          WHERE type = 'buy' AND plan_id IN (${dayPlaceholders})
          GROUP BY plan_id`,
    args: planIds,
  })
  const tickerMap = new Map(
    (
      tickerAggRows as unknown as {
        plan_id: string
        total_spent: number
        total_buy_qty: number
      }[]
    ).map((r) => [r.plan_id, r])
  )

  return planRows.map((row) => {
    const plan = rowToPlan(row)
    const completedDays = dayMap.get(plan.id) ?? 0
    const sellInfo = sellMap.get(plan.id) ?? { count: 0, qty: 0, proceeds: 0, fees: 0 }
    const ta = tickerMap.get(plan.id)
    const totalSpent = ta?.total_spent ?? 0
    const totalBuyQty = ta?.total_buy_qty ?? 0
    const remainingAmount = Math.max(0, plan.totalAmount - totalSpent)
    const planAvgCost = totalBuyQty > 0 ? totalSpent / totalBuyQty : null
    const targetSellPrice = planAvgCost != null ? planAvgCost * (1 + plan.targetReturn) : null
    const holdingQty = Math.max(0, totalBuyQty - sellInfo.qty)
    const completedSplits = plan.dailyAmount > 0 ? Math.round(totalSpent / plan.dailyAmount) : 0
    const firstSellCompleted = completedSplits > plan.splits / 2 && sellInfo.count >= 1
    const realizedPnl = planAvgCost != null && sellInfo.qty > 0
      ? (sellInfo.proceeds - sellInfo.fees) - planAvgCost * sellInfo.qty
      : null
    return { ...plan, completedDays, completedSplits, remainingAmount, planAvgCost, targetSellPrice, firstSellCompleted, holdingQty, realizedPnl }
  })
}

export async function getPlanById(id: string): Promise<PlanWithProgress | null> {
  const { rows } = await getDb().execute({
    sql: 'SELECT * FROM plans WHERE id = ?',
    args: [id],
  })
  const row = rows[0] as unknown as Parameters<typeof rowToPlan>[0] | undefined
  if (!row) return null
  const plan = rowToPlan(row)
  return {
    ...plan,
    ...(await calcPlanProgress(plan.id, plan.tickerId, plan.totalAmount, plan.splits, plan.targetReturn)),
  }
}

export async function getActivePlanByTicker(tickerId: string): Promise<Plan | null> {
  const { rows } = await getDb().execute({
    sql: `SELECT * FROM plans WHERE ticker_id = ? AND status = 'active' LIMIT 1`,
    args: [tickerId],
  })
  const row = rows[0] as unknown as Parameters<typeof rowToPlan>[0] | undefined
  return row ? rowToPlan(row) : null
}

export async function createPlan(
  tickerId: string,
  totalAmount: number,
  splits = 40,
  targetReturn = 0.1,
  feeRate = 0.0025
): Promise<Plan> {
  const id = crypto.randomUUID()
  const dailyAmount = totalAmount / splits
  const startDate = new Date().toISOString().slice(0, 10)
  await getDb().execute({
    sql: `INSERT INTO plans (id, ticker_id, total_amount, daily_amount, splits, target_return, fee_rate, status, start_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    args: [id, tickerId, totalAmount, dailyAmount, splits, targetReturn, feeRate, startDate],
  })
  return (await getPlanById(id))! as Plan
}

export async function completePlan(id: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  await getDb().execute({
    sql: `UPDATE plans SET status = 'completed', completed_at = ? WHERE id = ?`,
    args: [today, id],
  })
}

export async function deletePlan(id: string): Promise<void> {
  const db = getDb()
  await db.execute({ sql: `DELETE FROM plan_daily_skips WHERE plan_id = ?`, args: [id] })
  await db.execute({ sql: `DELETE FROM transactions WHERE plan_id = ?`, args: [id] })
  await db.execute({ sql: `DELETE FROM plans WHERE id = ?`, args: [id] })
}

export async function getTodayBoughtPlanIds(planIds: string[], date: string): Promise<string[]> {
  if (planIds.length === 0) return []
  const placeholders = planIds.map(() => '?').join(',')
  const [{ rows: txRows }, { rows: skipRows }] = await Promise.all([
    getDb().execute({
      sql: `SELECT DISTINCT plan_id FROM transactions
            WHERE date = ? AND type = 'buy' AND plan_id IN (${placeholders})`,
      args: [date, ...planIds],
    }),
    getDb().execute({
      sql: `SELECT DISTINCT plan_id FROM plan_daily_skips
            WHERE date = ? AND type = 'buy' AND plan_id IN (${placeholders})`,
      args: [date, ...planIds],
    }),
  ])
  const ids = new Set([
    ...(txRows as unknown as { plan_id: string }[]).map((r) => r.plan_id),
    ...(skipRows as unknown as { plan_id: string }[]).map((r) => r.plan_id),
  ])
  return [...ids]
}

export async function getTodaySellSkippedPlanIds(planIds: string[], date: string): Promise<string[]> {
  if (planIds.length === 0) return []
  const placeholders = planIds.map(() => '?').join(',')
  const { rows } = await getDb().execute({
    sql: `SELECT DISTINCT plan_id FROM plan_daily_skips
          WHERE date = ? AND type = 'sell' AND plan_id IN (${placeholders})`,
    args: [date, ...planIds],
  })
  return (rows as unknown as { plan_id: string }[]).map((r) => r.plan_id)
}

export async function recordSkip(planId: string, date: string, type: 'buy' | 'sell'): Promise<void> {
  await getDb().execute({
    sql: `INSERT INTO plan_daily_skips (plan_id, date, type) VALUES (?, ?, ?)
          ON CONFLICT DO NOTHING`,
    args: [planId, date, type],
  })
}

export async function isDuplicateDate(planId: string, date: string, excludeTxId?: string): Promise<boolean> {
  const { rows } = await getDb().execute({
    sql: excludeTxId
      ? `SELECT 1 FROM transactions WHERE plan_id = ? AND date = ? AND type = 'buy' AND id != ? LIMIT 1`
      : `SELECT 1 FROM transactions WHERE plan_id = ? AND date = ? AND type = 'buy' LIMIT 1`,
    args: excludeTxId ? [planId, date, excludeTxId] : [planId, date],
  })
  return rows.length > 0
}

export interface DailyEntryData {
  date: string
  quantity: number
  price: number
  fee: number
}

export async function recordDailyEntry(planId: string, data: DailyEntryData): Promise<void> {
  const plan = await getPlanById(planId)
  if (!plan || plan.status !== 'active') throw new Error('Plan not found or not active')
  if (await isDuplicateDate(planId, data.date)) throw new Error('Entry already exists for this date')

  await createTransaction({
    tickerId: plan.tickerId,
    type: 'buy',
    date: data.date,
    quantity: data.quantity,
    price: data.price,
    fee: data.fee,
    planId,
  })

  const updatedPlan = (await getPlanById(planId))!
  if (updatedPlan.completedDays >= updatedPlan.splits) {
    await completePlan(planId)
  }
}


export interface SellData {
  date: string
  quantity: number
  price: number
  fee: number
}

export async function recordSell(planId: string, data: SellData): Promise<void> {
  const plan = await getPlanById(planId)
  if (!plan || plan.status !== 'active') throw new Error('Plan not found or not active')
  if (data.quantity > plan.holdingQty) throw new Error('매도 수량이 보유 수량을 초과합니다.')

  await createTransaction({
    tickerId: plan.tickerId,
    type: 'sell',
    date: data.date,
    quantity: data.quantity,
    price: data.price,
    fee: data.fee,
    planId,
  })

  // Check remaining holding for this plan
  const { rows } = await getDb().execute({
    sql: `SELECT
            COALESCE(SUM(CASE WHEN type='buy' THEN quantity ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type='sell' THEN quantity ELSE 0 END), 0) AS remaining
          FROM transactions WHERE plan_id = ?`,
    args: [planId],
  })
  const remaining = Number((rows[0] as unknown as { remaining: number }).remaining)
  if (remaining <= 0) {
    await completePlan(planId)
  }
}
