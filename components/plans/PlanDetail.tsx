import { Badge } from '@/components/ui/badge'
import type { PlanWithProgress } from '@/types'
import { formatUSD } from '@/lib/format'

interface Props {
  plan: PlanWithProgress
  totalFee?: number
}

export function PlanDetail({ plan, totalFee }: Props) {
  const pct = Math.min(100, (plan.completedDays / plan.splits) * 100)
  const isActive = plan.status === 'active'
  const halfN = plan.splits / 2

  const firstSellPrice =
    plan.planAvgCost != null && plan.completedDays > halfN
      ? plan.planAvgCost * 1.05
      : null
  const targetSellPrice = plan.targetSellPrice

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold">{plan.tickerId}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
          }`}
        >
          {isActive ? '진행 중' : '완료'}
        </span>
        {plan.firstSellCompleted && (
          <Badge variant="secondary" className="text-xs">1차 매도 완료</Badge>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-muted-foreground">진행률</span>
          <span className="text-sm font-medium tabular-nums">{plan.completedDays} / {plan.splits}</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">총 투자금</p>
          <p className="text-base font-semibold tabular-nums">{formatUSD(plan.totalAmount)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">회당 투자금</p>
          <p className="text-base font-semibold tabular-nums">{formatUSD(plan.dailyAmount)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">잔여 투자금</p>
          <p className="text-base font-semibold tabular-nums">{formatUSD(plan.remainingAmount)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">평균단가</p>
          <p className="text-base font-semibold tabular-nums">
            {plan.planAvgCost != null ? formatUSD(plan.planAvgCost) : '—'}
          </p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">시작일</p>
          <p className="text-base font-semibold tabular-nums">{plan.startDate}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">매도 수수료율</p>
          <p className="text-base font-semibold tabular-nums">{(plan.feeRate * 100).toFixed(2)}%</p>
        </div>
        {totalFee != null && (
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">누적 수수료</p>
            <p className="text-base font-semibold tabular-nums">{formatUSD(totalFee)}</p>
          </div>
        )}
      </section>

      {plan.planAvgCost != null && (
        <section className="border rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">매도 목표</p>
          {plan.completedDays <= halfN ? (
            <div className="flex items-center justify-between text-sm">
              <span>목표가 (+{Math.round(plan.targetReturn * 100)}%)</span>
              <span className="font-semibold tabular-nums text-green-700">
                {targetSellPrice != null ? formatUSD(targetSellPrice) : '—'}
              </span>
            </div>
          ) : plan.firstSellCompleted ? (
            <div className="flex items-center justify-between text-sm">
              <span>2차 목표가 (+{Math.round(plan.targetReturn * 100)}%)</span>
              <span className="font-semibold tabular-nums text-green-700">
                {targetSellPrice != null ? formatUSD(targetSellPrice) : '—'}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>1차 목표가 (+5%)</span>
                <span className="font-semibold tabular-nums">
                  {firstSellPrice != null ? formatUSD(firstSellPrice) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>2차 목표가 (+{Math.round(plan.targetReturn * 100)}%)</span>
                <span className="font-semibold tabular-nums text-green-700">
                  {targetSellPrice != null ? formatUSD(targetSellPrice) : '—'}
                </span>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
