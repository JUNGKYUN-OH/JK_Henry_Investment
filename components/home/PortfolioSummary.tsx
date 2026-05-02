import { formatUSD, formatPct } from '@/lib/format'

interface Props {
  totalCost: number
  marketValue: number | null
  unrealizedPnl: number | null
}

export function PortfolioSummary({ totalCost, marketValue, unrealizedPnl }: Props) {
  const pct =
    unrealizedPnl != null && totalCost > 0
      ? (unrealizedPnl / totalCost) * 100
      : null

  return (
    <section className="grid grid-cols-2 gap-3">
      <div className="border rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">총 투자금</p>
        <p className="text-base font-semibold tabular-nums">{formatUSD(totalCost)}</p>
      </div>
      <div className="border rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">총 평가금액</p>
        <p className="text-base font-semibold tabular-nums">
          {marketValue != null ? formatUSD(marketValue) : '—'}
        </p>
      </div>
      <div className="border rounded-lg p-3 col-span-2">
        <p className="text-xs text-muted-foreground mb-1">미실현손익</p>
        <div className="flex items-baseline gap-2">
          <p
            className={`text-base font-semibold tabular-nums ${
              unrealizedPnl == null ? '' : unrealizedPnl >= 0 ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {unrealizedPnl != null ? formatUSD(unrealizedPnl) : '—'}
          </p>
          {pct != null && (
            <span
              className={`text-sm tabular-nums ${
                pct >= 0 ? 'text-green-600' : 'text-destructive'
              }`}
            >
              {formatPct(pct)}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
