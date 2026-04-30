import { calcActiveHoldings } from '@/services/portfolio'
import { formatUSD, formatPct, formatQty } from '@/lib/format'

export async function HoldingsTable() {
  const holdings = await calcActiveHoldings()

  if (holdings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">보유 중인 종목이 없습니다.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-left">
            <th className="py-2 pr-4 font-medium">종목</th>
            <th className="py-2 pr-4 font-medium text-right">수량</th>
            <th className="py-2 pr-4 font-medium text-right">평균단가</th>
            <th className="py-2 pr-4 font-medium text-right">투자금액</th>
            <th className="py-2 pr-4 font-medium text-right">현재가</th>
            <th className="py-2 pr-4 font-medium text-right">평가금액</th>
            <th className="py-2 pr-4 font-medium text-right">미실현손익</th>
            <th className="py-2 font-medium text-right">실현손익</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.tickerId} className="border-b last:border-0">
              <td className="py-3 pr-4 font-mono font-medium">{h.tickerId}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatQty(h.quantity)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatUSD(h.avgCost)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatUSD(h.totalCost)}</td>
              <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                {h.currentPrice != null ? formatUSD(h.currentPrice) : '—'}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">
                {h.marketValue != null ? formatUSD(h.marketValue) : '—'}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">
                {h.unrealizedPnl != null ? (
                  <span className={h.unrealizedPnl >= 0 ? 'text-green-600' : 'text-destructive'}>
                    {formatUSD(h.unrealizedPnl)}{' '}
                    {h.unrealizedPnlPct != null && `(${formatPct(h.unrealizedPnlPct)})`}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-3 text-right tabular-nums">
                {h.realizedPnl !== 0 ? (
                  <span className={h.realizedPnl >= 0 ? 'text-green-600' : 'text-destructive'}>
                    {formatUSD(h.realizedPnl)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
