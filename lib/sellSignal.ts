export type SellType = 'full' | 'first' | 'second'

/** splits/2 기준으로 어떤 매도 단계인지 반환 (가격 무관, 금액 기반 completedSplits 사용) */
export function computeSellType(plan: {
  completedSplits: number
  splits: number
  firstSellCompleted: boolean
}): SellType {
  if (plan.completedSplits <= plan.splits / 2) return 'full'
  if (!plan.firstSellCompleted) return 'first'
  return 'second'
}

/** 해당 매도 단계의 목표가 반환 */
export function computeSellTargetPrice(plan: {
  planAvgCost: number
  targetReturn: number
  completedSplits: number
  splits: number
  firstSellCompleted: boolean
}): number {
  const type = computeSellType(plan)
  if (type === 'first') return plan.planAvgCost * 1.05
  return plan.planAvgCost * (1 + plan.targetReturn)
}

/** @deprecated 가격 임계값 도달 시에만 신호 반환 — SellConfirmForm에서 신호 라벨 용도로만 사용 */
export function computeSellSignal(
  plan: {
    completedSplits: number
    splits: number
    targetReturn: number
    planAvgCost: number | null
    firstSellCompleted: boolean
  },
  currentPrice: number
): SellType | null {
  if (plan.planAvgCost == null) return null

  const round2 = (n: number) => Math.round(n * 100) / 100
  const halfN = plan.splits / 2
  const targetThreshold = round2(plan.planAvgCost * (1 + plan.targetReturn))
  const firstThreshold = round2(plan.planAvgCost * 1.05)

  if (plan.completedSplits <= halfN) {
    return currentPrice >= targetThreshold ? 'full' : null
  } else {
    if (!plan.firstSellCompleted) {
      return currentPrice >= firstThreshold ? 'first' : null
    } else {
      return currentPrice >= targetThreshold ? 'second' : null
    }
  }
}
