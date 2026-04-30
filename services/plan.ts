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

function calcPlanProgress(planId: string, totalAmount: number, dailyAmount: number) {
  const db = getDb()
  const txRows = db
    .prepare(
      `SELECT quantity, price FROM transactions WHERE plan_id = ? AND type = 'buy'`
    )
    .all(planId) as { quantity: number; price: number }[]

  const completedDays = txRows.length
  const totalSpent = txRows.reduce((sum, r) => sum + r.quantity * r.price, 0)
  const totalBuyQty = txRows.reduce((sum, r) => sum + r.quantity, 0)
  const remainingAmount = Math.max(0, totalAmount - totalSpent)
  const planAvgCost = totalBuyQty > 0 ? totalSpent / totalBuyQty : null
  const targetSellPrice = planAvgCost != null ? planAvgCost * 1.1 : null

  return { completedDays, remainingAmount, planAvgCost, targetSellPrice }
}

export function getAllPlans(): PlanWithProgress[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM plans ORDER BY created_at DESC')
    .all() as Parameters<typeof rowToPlan>[0][]

  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const placeholders = ids.map(() => '?').join(',')
  const txAgg = db
    .prepare(
      `SELECT plan_id,
              COUNT(*) AS completed_days,
              SUM(quantity * price) AS total_spent,
              SUM(quantity) AS total_buy_qty
       FROM transactions
       WHERE type = 'buy' AND plan_id IN (${placeholders})
       GROUP BY plan_id`
    )
    .all(...ids) as {
    plan_id: string
    completed_days: number
    total_spent: number
    total_buy_qty: number
  }[]

  const aggMap = new Map(txAgg.map((r) => [r.plan_id, r]))

  return rows.map((row) => {
    const plan = rowToPlan(row)
    const agg = aggMap.get(plan.id)
    const completedDays = agg?.completed_days ?? 0
    const totalSpent = agg?.total_spent ?? 0
    const totalBuyQty = agg?.total_buy_qty ?? 0
    const remainingAmount = Math.max(0, plan.totalAmount - totalSpent)
    const planAvgCost = totalBuyQty > 0 ? totalSpent / totalBuyQty : null
    const targetSellPrice = planAvgCost != null ? planAvgCost * 1.1 : null
    return { ...plan, completedDays, remainingAmount, planAvgCost, targetSellPrice }
  })
}

export function getPlanById(id: string): PlanWithProgress | null {
  const row = getDb()
    .prepare('SELECT * FROM plans WHERE id = ?')
    .get(id) as Parameters<typeof rowToPlan>[0] | undefined
  if (!row) return null
  const plan = rowToPlan(row)
  return { ...plan, ...calcPlanProgress(plan.id, plan.totalAmount, plan.dailyAmount) }
}

export function getActivePlanByTicker(tickerId: string): Plan | null {
  const row = getDb()
    .prepare(`SELECT * FROM plans WHERE ticker_id = ? AND status = 'active' LIMIT 1`)
    .get(tickerId) as Parameters<typeof rowToPlan>[0] | undefined
  return row ? rowToPlan(row) : null
}

export function createPlan(tickerId: string, totalAmount: number): Plan {
  const existing = getActivePlanByTicker(tickerId)
  if (existing) throw new Error(`Active plan already exists for ${tickerId}`)

  const id = crypto.randomUUID()
  const dailyAmount = totalAmount / 40
  const startDate = new Date().toISOString().slice(0, 10)
  getDb()
    .prepare(
      `INSERT INTO plans (id, ticker_id, total_amount, daily_amount, status, start_date)
       VALUES (?, ?, ?, ?, 'active', ?)`
    )
    .run(id, tickerId, totalAmount, dailyAmount, startDate)
  return getPlanById(id)! as Plan
}

export function completePlan(id: string): void {
  getDb().prepare(`UPDATE plans SET status = 'completed' WHERE id = ?`).run(id)
}

export function isDuplicateDate(planId: string, date: string): boolean {
  return !!getDb()
    .prepare(`SELECT 1 FROM transactions WHERE plan_id = ? AND date = ? LIMIT 1`)
    .get(planId, date)
}

export interface DailyEntryData {
  date: string
  quantity: number
  price: number
  fee: number
}

export function recordDailyEntry(planId: string, data: DailyEntryData): void {
  const plan = getPlanById(planId)
  if (!plan || plan.status !== 'active') throw new Error('Plan not found or not active')
  if (isDuplicateDate(planId, data.date)) throw new Error('Entry already exists for this date')

  createTransaction({
    tickerId: plan.tickerId,
    type: 'buy',
    date: data.date,
    quantity: data.quantity,
    price: data.price,
    fee: data.fee,
    planId,
  })

  const updatedPlan = getPlanById(planId)!
  if (updatedPlan.completedDays >= 40) {
    completePlan(planId)
  }
}
