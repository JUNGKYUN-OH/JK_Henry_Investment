import Link from 'next/link'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatUSD } from '@/lib/format'
import type { PlanWithProgress } from '@/types'

interface Props {
  plans: PlanWithProgress[]
  todayBoughtPlanIds: string[]
  isTradingDay: boolean
  prices: Record<string, { price: number; fetchedAt: string }>
  loading: boolean
  priceError: boolean
}

export function TodayTaskList({
  plans,
  todayBoughtPlanIds,
  isTradingDay,
  prices,
  loading,
  priceError,
}: Props) {
  if (!isTradingDay) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
        <AlertCircle className="size-4 shrink-0" />
        오늘은 거래일이 아닙니다
      </div>
    )
  }

  const activePlans = plans.filter((p) => p.status === 'active')

  if (activePlans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">진행 중인 계획이 없습니다.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {activePlans.map((plan) => {
        const done = todayBoughtPlanIds.includes(plan.id)
        const priceInfo = prices[plan.tickerId]
        const currentPrice = priceInfo?.price
        const estQty = currentPrice ? plan.dailyAmount / currentPrice : null

        // % to target (only for ≤ N/2)
        const showTargetPct =
          plan.planAvgCost != null &&
          plan.targetSellPrice != null &&
          plan.completedDays <= plan.splits / 2 &&
          currentPrice != null
        const targetPct =
          showTargetPct && plan.targetSellPrice != null && currentPrice != null
            ? ((plan.targetSellPrice - currentPrice) / currentPrice) * 100
            : null

        if (done) {
          return (
            <div
              key={plan.id}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-muted-foreground"
            >
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              <span className="font-medium text-sm">{plan.tickerId}</span>
              <Badge variant="secondary" className="ml-auto text-xs">오늘 완료</Badge>
            </div>
          )
        }

        return (
          <Link
            key={plan.id}
            href={`/plans/${plan.id}/buy`}
            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
          >
            <Circle className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{plan.tickerId}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {plan.dailyAmount > 0 ? Math.round((plan.totalAmount - plan.remainingAmount) / plan.dailyAmount) : 0}/{plan.splits}
                  </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {loading ? (
                  <Skeleton className="h-3 w-16" />
                ) : priceError && !currentPrice ? (
                  <span className="text-xs text-destructive">가격 조회 실패</span>
                ) : currentPrice ? (
                  <>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatUSD(currentPrice)}
                    </span>
                    {estQty != null && (
                      <span className="text-xs text-muted-foreground">
                        예상 {estQty.toFixed(3)}주
                      </span>
                    )}
                    {targetPct != null && (
                      <span className="text-xs text-muted-foreground">
                        목표까지 {targetPct >= 0 ? '+' : ''}{targetPct.toFixed(1)}%
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            </div>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {formatUSD(plan.dailyAmount)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
