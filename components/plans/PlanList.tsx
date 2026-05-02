import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { PlanWithProgress } from '@/types'
import { formatUSD } from '@/lib/format'

interface Props {
  plans: PlanWithProgress[]
}

export function PlanList({ plans }: Props) {
  const active = plans.filter((p) => p.status === 'active')
  const completed = plans.filter((p) => p.status === 'completed')

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        진행 중인 계획이 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-3">진행 중</h2>
          <div className="space-y-3">
            {active.map((plan) => (
              <ActivePlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-3">완료</h2>
          <div className="space-y-2">
            {completed.map((plan) => (
              <Link
                key={plan.id}
                href={`/plans/${plan.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{plan.tickerId}({plan.startDate})</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatUSD(plan.totalAmount)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ActivePlanCard({ plan }: { plan: PlanWithProgress }) {
  const usedAmount = plan.totalAmount - plan.remainingAmount
  const completedSplits = plan.dailyAmount > 0 ? Math.round(usedAmount / plan.dailyAmount) : 0
  const pct = Math.min(100, (usedAmount / plan.totalAmount) * 100)

  return (
    <Link href={`/plans/${plan.id}`} className="block border rounded-lg p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{plan.tickerId}({plan.startDate})</span>
          {plan.firstSellCompleted && (
            <Badge variant="secondary" className="text-xs">1차 완료</Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {completedSplits} / {plan.splits}
        </span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">총 투자금</p>
          <p className="tabular-nums font-medium">{formatUSD(plan.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">잔여 금액</p>
          <p className="tabular-nums font-medium">{formatUSD(plan.remainingAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">평균단가</p>
          <p className="tabular-nums font-medium">
            {plan.planAvgCost != null ? formatUSD(plan.planAvgCost) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">목표매도가</p>
          <p className="tabular-nums font-medium">
            {plan.targetSellPrice != null ? formatUSD(plan.targetSellPrice) : '—'}
          </p>
        </div>
      </div>
    </Link>
  )
}
