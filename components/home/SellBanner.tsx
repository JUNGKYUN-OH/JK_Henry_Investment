import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatUSD } from '@/lib/format'
import type { PlanWithProgress } from '@/types'
import { computeSellType, computeSellTargetPrice } from '@/lib/sellSignal'

interface Props {
  plans: PlanWithProgress[]
  prices: Record<string, { price: number; fetchedAt: string }>
}

function signalLabel(signal: 'full' | 'first' | 'second'): string {
  if (signal === 'first') return '1차 매도'
  if (signal === 'second') return '2차 매도'
  return '전량 매도'
}

export function SellBanner({ plans, prices }: Props) {
  const items = plans.flatMap((plan) => {
    if (!plan.planAvgCost || plan.holdingQty <= 0) return []
    const priceInfo = prices[plan.tickerId]
    if (!priceInfo) return []

    const sellType = computeSellType(plan)
    const targetPrice = computeSellTargetPrice({
      planAvgCost: plan.planAvgCost,
      targetReturn: plan.targetReturn,
      completedSplits: plan.completedSplits,
      splits: plan.splits,
      firstSellCompleted: plan.firstSellCompleted,
    })
    const currentPrice = priceInfo.price
    const targetMet = currentPrice >= targetPrice
    const pctGain = ((currentPrice - plan.planAvgCost) / plan.planAvgCost) * 100
    const pctToTarget = ((targetPrice - currentPrice) / currentPrice) * 100

    return [{ plan, sellType, targetPrice, currentPrice, targetMet, pctGain, pctToTarget }]
  })

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {items.map(({ plan, sellType, targetPrice, currentPrice, targetMet, pctGain, pctToTarget }) => (
        <Link
          key={plan.id}
          href={`/plans/${plan.id}/sell`}
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
        >
          {targetMet
            ? <TrendingUp className="size-4 shrink-0 text-green-600" />
            : <TrendingDown className="size-4 shrink-0 text-muted-foreground" />
          }
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">{plan.tickerId}({plan.startDate})</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                현재 {formatUSD(currentPrice)}
              </span>
              <span className={`text-xs tabular-nums ${pctGain >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {pctGain >= 0 ? '+' : ''}{pctGain.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              {targetMet ? (
                <span className="text-xs text-green-600 font-medium">목표가 달성</span>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  목표 {formatUSD(targetPrice)} ({pctToTarget.toFixed(1)}% 남음)
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs font-medium tabular-nums shrink-0 ${targetMet ? 'text-green-600' : 'text-muted-foreground'}`}>
            {signalLabel(sellType)}
          </span>
        </Link>
      ))}
    </div>
  )
}
