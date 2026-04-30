import { calcClosedPositions } from '@/services/portfolio'
import { formatUSD } from '@/lib/format'

export async function ClosedPositionsTable() {
  const closed = await calcClosedPositions()

  if (closed.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium mb-3">매도 완료</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-left">
              <th className="py-2 pr-4 font-medium">종목</th>
              <th className="py-2 pr-4 font-medium text-right">총 실현손익</th>
              <th className="py-2 font-medium text-right">총 수수료</th>
            </tr>
          </thead>
          <tbody>
            {closed.map((c) => (
              <tr key={c.tickerId} className="border-b last:border-0">
                <td className="py-3 pr-4 font-mono font-medium text-muted-foreground">
                  {c.tickerId}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  <span className={c.realizedPnl >= 0 ? 'text-green-600' : 'text-destructive'}>
                    {formatUSD(c.realizedPnl)}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums text-muted-foreground">
                  {c.totalFee > 0 ? formatUSD(c.totalFee) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
