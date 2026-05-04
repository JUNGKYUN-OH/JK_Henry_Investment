import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatUSD } from '@/lib/format'
import type { PlanWithProgress } from '@/types'
import { computeSellType } from '@/lib/sellSignal'

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

    const avg = plan.planAvgCost
    const sellType = computeSellType(plan)
    const currentPrice = priceInfo.price
    const pctGain = ((currentPrice - avg) / avg) * 100

    const firstTarget = avg * 1.05
    const fullTarget = avg * (1 + plan.targetReturn)
    const targetReturnPct = Math.round(plan.targetReturn * 100)

    // Targets to display based on sell stage
    const targets: { label: string; price: number }[] =
      sellType === 'first'
        ? [
            { label: '+5% 지정가', price: firstTarget },
            { label: `+${targetReturnPct}% 지정가`, price: fullTarget },
          ]
        : [{ label: `+${targetReturnPct}% 지정가`, price: sellType === 'full' ? fullTarget : fullTarget }]

    const primaryTarget = targets[targets.length - 1].price
    const targetMet = currentPrice >= targets[0].price

    return [{ plan, sellType, targets, primaryTarget, currentPrice, targetMet, pctGain }]
  })

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {items.map(({ plan, sellType, targets, currentPrice, targetMet, pctGain }) => (
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
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{plan.tickerId}({plan.startDate})</span>
              <span className={`text-xs font-medium shrink-0 ${targetMet ? 'text-green-600' : 'text-muted-foreground'}`}>
                {signalLabel(sellType)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground tabular-nums">
                현재 {formatUSD(currentPrice)}
              </span>
              <span className={`text-xs tabular-nums ${pctGain >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                ({pctGain >= 0 ? '+' : ''}{pctGain.toFixed(1)}%)
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              {targets.map((t) => (
                <span
                  key={t.label}
                  className={`text-xs tabular-nums ${currentPrice >= t.price ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
                >
                  {t.label}: {formatUSD(t.price)}
                </span>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
