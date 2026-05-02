export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlanList } from '@/components/plans/PlanList'
import { AnnualPnlTable } from '@/components/plans/AnnualPnlTable'
import { PortfolioSummary } from '@/components/home/PortfolioSummary'
import { getAllPlans } from '@/services/plan'
import { calcActiveHoldings } from '@/services/portfolio'
import { getCachedPrices } from '@/services/price'

export default async function PlansPage() {
  const [plans, holdings, cachedPricesMap] = await Promise.all([
    getAllPlans(),
    calcActiveHoldings(),
    getCachedPrices(),
  ])

  const totalCost = holdings.reduce((acc, h) => acc + h.totalCost, 0)
  const marketValue = holdings.length > 0
    ? holdings.reduce((acc, h) => {
        const p = cachedPricesMap.get(h.tickerId)?.price
        return p != null ? acc + p * h.quantity : acc + h.totalCost
      }, 0)
    : null
  const unrealizedPnl = marketValue != null ? marketValue - totalCost : null

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">투자 계획</h1>
        <Button asChild size="sm">
          <Link href="/plans/new">+ 새 계획</Link>
        </Button>
      </div>

      {holdings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">포트폴리오</h2>
          <PortfolioSummary
            totalCost={totalCost}
            marketValue={marketValue}
            unrealizedPnl={unrealizedPnl}
          />
        </section>
      )}

      <AnnualPnlTable plans={plans} />

      <PlanList plans={plans} />
    </div>
  )
}
