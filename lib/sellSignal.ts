export function computeSellSignal(
  plan: {
    completedDays: number
    splits: number
    targetReturn: number
    planAvgCost: number | null
    firstSellCompleted: boolean
  },
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
