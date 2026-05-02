import type { PlanWithProgress } from '@/types'
import { formatUSD } from '@/lib/format'

interface Props {
  plans: PlanWithProgress[]
}

interface YearRow {
  year: string
  realizedPnl: number
  planCount: number
}

function buildAnnualRows(plans: PlanWithProgress[]): YearRow[] {
  const map = new Map<string, YearRow>()

  for (const plan of plans) {
    if (plan.status !== 'completed' || !plan.completedAt) continue
    const year = plan.completedAt.slice(0, 4)
    const existing = map.get(year) ?? { year, realizedPnl: 0, planCount: 0 }
    existing.realizedPnl += plan.realizedPnl ?? 0
    existing.planCount += 1
    map.set(year, existing)
  }

  return [...map.values()].sort((a, b) => b.year.localeCompare(a.year))
}

export function AnnualPnlTable({ plans }: Props) {
  const rows = buildAnnualRows(plans)
  if (rows.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold mb-3">연도별 실현손익</h2>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium">연도</th>
              <th className="text-right px-4 py-2.5 font-medium">실현손익</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">완료 계획</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year} className="border-b last:border-0">
                <td className="px-4 py-2.5 font-medium tabular-nums">{row.year}</td>
                <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${row.realizedPnl >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {row.realizedPnl >= 0 ? '+' : ''}{formatUSD(row.realizedPnl)}
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                  {row.planCount}건
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
