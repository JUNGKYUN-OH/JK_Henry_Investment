import type { PlanWithProgress } from '@/types'
import { formatUSD } from '@/lib/format'

interface Props {
  plan: PlanWithProgress
}

export function PlanDetail({ plan }: Props) {
  const pct = Math.min(100, (plan.completedDays / 40) * 100)
  const isActive = plan.status === 'active'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold">{plan.tickerId}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive
              ? 'bg-blue-100 text-blue-700'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isActive ? '진행 중' : '완료'}
        </span>
      </div>

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-muted-foreground">진행률</span>
          <span className="text-sm font-medium">{plan.completedDays} / 40일</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">총 투자금</p>
          <p className="text-base font-semibold tabular-nums">{formatUSD(plan.totalAmount)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">일 투자금</p>
          <p className="text-base font-semibold tabular-nums">{formatUSD(plan.dailyAmount)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">잔여 금액</p>
          <p className="text-base font-semibold tabular-nums">{formatUSD(plan.remainingAmount)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">시작일</p>
          <p className="text-base font-semibold tabular-nums">{plan.startDate}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">평균단가</p>
          <p className="text-base font-semibold tabular-nums">
            {plan.planAvgCost != null ? formatUSD(plan.planAvgCost) : '—'}
          </p>
        </div>
        <div className="border rounded-lg p-3 border-green-200 bg-green-50/50">
          <p className="text-xs text-muted-foreground mb-1">목표매도가 (+10%)</p>
          <p className="text-base font-semibold tabular-nums text-green-700">
            {plan.targetSellPrice != null ? formatUSD(plan.targetSellPrice) : '—'}
          </p>
        </div>
      </section>
    </div>
  )
}
