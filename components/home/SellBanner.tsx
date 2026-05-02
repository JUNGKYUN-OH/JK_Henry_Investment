import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { formatUSD } from '@/lib/format'
import type { PlanWithProgress } from '@/types'
import { computeSellSignal } from '@/lib/sellSignal'

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
    const priceInfo = prices[plan.tickerId]
    if (!priceInfo || !plan.planAvgCost) return []
    const signal = computeSellSignal(plan, priceInfo.price)
    if (!signal) return []
    const pctGain = ((priceInfo.price - plan.planAvgCost) / plan.planAvgCost) * 100
    return [{ plan, signal, currentPrice: priceInfo.price, pctGain }]
  })

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {items.map(({ plan, signal, currentPrice, pctGain }) => (
        <Link
          key={plan.id}
          href={`/plans/${plan.id}/sell`}
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
        >
          <TrendingUp className="size-4 shrink-0 text-green-600" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{plan.tickerId}({plan.startDate})</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatUSD(currentPrice)}
              </span>
              <span className="text-xs text-green-600 tabular-nums">
                +{pctGain.toFixed(1)}%
              </span>
            </div>
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {signalLabel(signal)}
          </span>
        </Link>
      ))}
    </div>
  )
}
