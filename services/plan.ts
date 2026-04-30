import { getDb } from '@/lib/db'
import type { Plan, PlanWithProgress } from '@/types'
import { createTransaction } from './transaction'

function rowToPlan(row: {
  id: string
  ticker_id: string
  total_amount: number
  daily_amount: number
  status: 'active' | 'completed'
  start_date: string
  created_at: string
}): Plan {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    totalAmount: row.total_amount,
    dailyAmount: row.daily_amount,
    status: row.status,
    startDate: row.start_date,
    createdAt: row.created_at,
  }
}

async function calcPlanProgress(planId: string, tickerId: string, totalAmount: number) {
  const db = getDb()

  const { rows: cntRows } = await db.execute({
    sql: `SELECT COUNT(*) AS cnt FROM transactions WHERE plan_id = ? AND type = 'buy'`,
    args: [planId],
  })
  const completedDays = Number((cntRows[0] as unknown as { cnt: number | bigint }).cnt)

  const { rows: allRows } = await db.execute({
    sql: `SELECT quantity, price FROM transactions WHERE ticker_id = ? AND type = 'buy'`,
    args: [tickerId],
  })
  const buyRows = allRows as unknown as { quantity: number; price: number }[]

  const totalSpent = buyRows.reduce((sum, r) => sum + r.quantity * r.price, 0)
  const totalBuyQty = buyRows.reduce((sum, r) => sum + r.quantity, 0)
  const remainingAmount = Math.max(0, totalAmount - totalSpent)
  const planAvgCost = totalBuyQty > 0 ? totalSpent / totalBuyQty : null
  const targetSellPrice = planAvgCost != null ? planAvgCost * 1.1 : null

  return { completedDays, remainingAmount, planAvgCost, targetSellPrice }
}

export async function getAllPlans(): Promise<PlanWithProgress[]> {
  const db = getDb()
  const { rows } = await db.execute('SELECT * FROM plans ORDER BY created_at DESC')
  const planRows = rows as unknown as Parameters<typeof rowToPlan>[0][]

  if (planRows.length === 0) return []

  const planIds = planRows.map((r) => r.id)
  const tickerIds = [...new Set(planRows.map((r) => r.ticker_id))]

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

  const tickerPlaceholders = tickerIds.map(() => '?').join(',')
  const { rows: tickerAggRows } = await db.execute({
    sql: `SELECT ticker_id,
                 SUM(quantity * price) AS total_spent,
                 SUM(quantity) AS total_buy_qty
          FROM transactions
          WHERE type = 'buy' AND ticker_id IN (${tickerPlaceholders})
          GROUP BY ticker_id`,
    args: tickerIds,
  })
  const tickerMap = new Map(
    (
      tickerAggRows as unknown as {
        ticker_id: string
        total_spent: number
        total_buy_qty: number
      }[]
    ).map((r) => [r.ticker_id, r])
  )

  return planRows.map((row) => {
    const plan = rowToPlan(row)
    const completedDays = dayMap.get(plan.id) ?? 0
    const ta = tickerMap.get(plan.tickerId)
    const totalSpent = ta?.total_spent ?? 0
    const totalBuyQty = ta?.total_buy_qty ?? 0
    const remainingAmount = Math.max(0, plan.totalAmount - totalSpent)
    const planAvgCost = totalBuyQty > 0 ? totalSpent / totalBuyQty : null
    const targetSellPrice = planAvgCost != null ? planAvgCost * 1.1 : null
    return { ...plan, completedDays, remainingAmount, planAvgCost, targetSellPrice }
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
  return { ...plan, ...(await calcPlanProgress(plan.id, plan.tickerId, plan.totalAmount)) }
}

export async function getActivePlanByTicker(tickerId: string): Promise<Plan | null> {
  const { rows } = await getDb().execute({
    sql: `SELECT * FROM plans WHERE ticker_id = ? AND status = 'active' LIMIT 1`,
    args: [tickerId],
  })
  const row = rows[0] as unknown as Parameters<typeof rowToPlan>[0] | undefined
  return row ? rowToPlan(row) : null
}

export async function createPlan(tickerId: string, totalAmount: number): Promise<Plan> {
  const existing = await getActivePlanByTicker(tickerId)
  if (existing) throw new Error(`Active plan already exists for ${tickerId}`)

  const id = crypto.randomUUID()
  const dailyAmount = totalAmount / 40
  const startDate = new Date().toISOString().slice(0, 10)
  await getDb().execute({
    sql: `INSERT INTO plans (id, ticker_id, total_amount, daily_amount, status, start_date)
          VALUES (?, ?, ?, ?, 'active', ?)`,
    args: [id, tickerId, totalAmount, dailyAmount, startDate],
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
    sql: `SELECT 1 FROM transactions WHERE plan_id = ? AND date = ? LIMIT 1`,
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
  if (updatedPlan.completedDays >= 40) {
    await completePlan(planId)
  }
}
