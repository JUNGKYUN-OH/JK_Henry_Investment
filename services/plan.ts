import { getDb } from '@/lib/db'
import type { Plan, PlanWithProgress } from '@/types'
import { createTransaction } from './transaction'

function rowToPlan(row: {
  id: string
  ticker_id: string
  total_amount: number
  daily_amount: number
  splits: number
  target_return: number
  status: 'active' | 'completed'
  start_date: string
  created_at: string
}): Plan {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    totalAmount: row.total_amount,
    dailyAmount: row.daily_amount,
    splits: row.splits ?? 40,
    targetReturn: row.target_return ?? 0.1,
    status: row.status,
    startDate: row.start_date,
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

  const { rows: sellCntRows } = await db.execute({
    sql: `SELECT COUNT(*) AS cnt FROM transactions WHERE plan_id = ? AND type = 'sell'`,
    args: [planId],
  })
  const sellCount = Number((sellCntRows[0] as unknown as { cnt: number | bigint }).cnt)
  const firstSellCompleted = completedDays > splits / 2 && sellCount >= 1

  return { completedDays, remainingAmount, planAvgCost, targetSellPrice, firstSellCompleted }
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
    sql: `SELECT plan_id, COUNT(*) AS sell_count
          FROM transactions
          WHERE type = 'sell' AND plan_id IN (${dayPlaceholders})
          GROUP BY plan_id`,
    args: planIds,
  })
  const sellMap = new Map(
    (sellCntRows as unknown as { plan_id: string; sell_count: number | bigint }[]).map((r) => [
      r.plan_id,
      Number(r.sell_count),
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
    const sellCount = sellMap.get(plan.id) ?? 0
    const ta = tickerMap.get(plan.id)
    const totalSpent = ta?.total_spent ?? 0
    const totalBuyQty = ta?.total_buy_qty ?? 0
    const remainingAmount = Math.max(0, plan.totalAmount - totalSpent)
    const planAvgCost = totalBuyQty > 0 ? totalSpent / totalBuyQty : null
    const targetSellPrice = planAvgCost != null ? planAvgCost * (1 + plan.targetReturn) : null
    const firstSellCompleted = completedDays > plan.splits / 2 && sellCount >= 1
    return { ...plan, completedDays, remainingAmount, planAvgCost, targetSellPrice, firstSellCompleted }
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
  targetReturn = 0.1
): Promise<Plan> {
  const existing = await getActivePlanByTicker(tickerId)
  if (existing) throw new Error(`Active plan already exists for ${tickerId}`)

  const id = crypto.randomUUID()
  const dailyAmount = totalAmount / splits
  const startDate = new Date().toISOString().slice(0, 10)
  await getDb().execute({
    sql: `INSERT INTO plans (id, ticker_id, total_amount, daily_amount, splits, target_return, status, start_date)
          VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
    args: [id, tickerId, totalAmount, dailyAmount, splits, targetReturn, startDate],
  })
  return (await getPlanById(id))! as Plan
}

export async function completePlan(id: string): Promise<void> {
  await getDb().execute({
    sql: `UPDATE plans SET status = 'completed' WHERE id = ?`,
    args: [id],
  })
}

export async function isDuplicateDate(planId: string, date: string): Promise<boolean> {
  const { rows } = await getDb().execute({
    sql: `SELECT 1 FROM transactions WHERE plan_id = ? AND date = ? AND type = 'buy' LIMIT 1`,
    args: [planId, date],
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

// Pure function — call with current price to determine sell signal
export function computeSellSignal(
  plan: Pick<
    PlanWithProgress,
    'completedDays' | 'splits' | 'targetReturn' | 'planAvgCost' | 'firstSellCompleted'
  >,
  currentPrice: number
): 'full' | 'first' | 'second' | null {
  if (plan.planAvgCost == null) return null

  const round2 = (n: number) => Math.round(n * 100) / 100
  const halfN = plan.splits / 2
  const targetThreshold = round2(plan.planAvgCost * (1 + plan.targetReturn))
  const firstThreshold = round2(plan.planAvgCost * 1.05)

  if (plan.completedDays <= halfN) {
    return currentPrice >= targetThreshold ? 'full' : null
  } else {
    if (!plan.firstSellCompleted) {
      return currentPrice >= firstThreshold ? 'first' : null
    } else {
      return currentPrice >= targetThreshold ? 'second' : null
    }
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
