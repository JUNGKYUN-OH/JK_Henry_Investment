import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { ClosedPositionsTable } from '@/components/dashboard/ClosedPositionsTable'
import { PriceRefreshButton } from '@/components/dashboard/PriceRefreshButton'
import { ManualPriceInput } from '@/components/dashboard/ManualPriceInput'
import { calcPortfolioSummary, calcActiveHoldings } from '@/services/portfolio'
import { getCachedPrices } from '@/services/price'
import { saveManualPricesAction } from '@/app/actions'
import { formatUSD } from '@/lib/format'

export default async function DashboardPage() {
  const summary = await calcPortfolioSummary()
  const holdings = await calcActiveHoldings()
  const priceCache = await getCachedPrices()

  const lastFetchedAt =
    priceCache.size > 0
      ? [...priceCache.values()].reduce((latest, p) =>
          p.fetchedAt > latest ? p.fetchedAt : latest,
          ''
        )
      : null

  const holdingTickerIds = holdings.map((h) => h.tickerId)
  const missingPriceTickers = holdingTickerIds.filter((id) => !priceCache.has(id))

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-semibold">대시보드</h1>
        <PriceRefreshButton lastFetchedAt={lastFetchedAt} />
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">총 투자금</p>
          <p className="text-lg font-semibold tabular-nums">{formatUSD(summary.totalCost)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">총 평가금액</p>
          <p className="text-lg font-semibold tabular-nums">
            {summary.marketValue != null ? formatUSD(summary.marketValue) : '—'}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">미실현손익</p>
          <p
            className={`text-lg font-semibold tabular-nums ${
              summary.unrealizedPnl == null
                ? ''
                : summary.unrealizedPnl >= 0
                ? 'text-green-600'
                : 'text-destructive'
            }`}
          >
            {summary.unrealizedPnl != null ? formatUSD(summary.unrealizedPnl) : '—'}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">총 수수료</p>
          <p className="text-lg font-semibold tabular-nums text-muted-foreground">
            {formatUSD(summary.totalFee)}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3">보유 중</h2>
        <HoldingsTable />
      </section>

      {missingPriceTickers.length > 0 && (
        <section className="mb-8">
          <ManualPriceInput tickerIds={missingPriceTickers} saveAction={saveManualPricesAction} />
        </section>
      )}

      <ClosedPositionsTable />
    </div>
  )
}
