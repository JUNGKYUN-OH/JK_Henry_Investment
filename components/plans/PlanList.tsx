import Link from 'next/link'
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
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">종목</th>
                  <th className="text-right px-4 py-2 font-medium">총 투자금</th>
                  <th className="text-right px-4 py-2 font-medium">일 투자금</th>
                  <th className="text-right px-4 py-2 font-medium">평균단가</th>
                  <th className="text-right px-4 py-2 font-medium">목표매도가</th>
                  <th className="text-right px-4 py-2 font-medium">시작일</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((plan) => (
                  <tr key={plan.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{plan.tickerId}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatUSD(plan.totalAmount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatUSD(plan.dailyAmount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {plan.planAvgCost != null ? formatUSD(plan.planAvgCost) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {plan.targetSellPrice != null ? formatUSD(plan.targetSellPrice) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {plan.startDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function ActivePlanCard({ plan }: { plan: PlanWithProgress }) {
  const pct = Math.min(100, (plan.completedDays / 40) * 100)

  return (
    <Link href={`/plans/${plan.id}`} className="block border rounded-lg p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono font-medium">{plan.tickerId}</span>
        <span className="text-sm text-muted-foreground">
          {plan.completedDays} / 40일
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
