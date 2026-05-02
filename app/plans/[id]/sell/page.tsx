export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlanById } from '@/services/plan'
import { computeSellSignal } from '@/lib/sellSignal'
import { getCachedPrices } from '@/services/price'
import { SellConfirmForm } from '@/components/plans/SellConfirmForm'
import { recordSellAction } from './actions'

export default async function SellPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const plan = await getPlanById(id)
  if (!plan || plan.status !== 'active') notFound()

  const cachedPricesMap = await getCachedPrices()
  const cachedPrice = cachedPricesMap.get(plan.tickerId)?.price ?? null

  if (plan.planAvgCost == null || plan.holdingQty <= 0) notFound()

  const sellSignal = cachedPrice != null ? computeSellSignal(plan, cachedPrice) : null
  if (!sellSignal) notFound()

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← 홈
        </Link>
      </div>

      <h1 className="text-lg font-semibold mb-6">매도 확인</h1>

      <SellConfirmForm
        planId={plan.id}
        tickerId={plan.tickerId}
        holdingQty={plan.holdingQty}
        planAvgCost={plan.planAvgCost}
        sellSignal={sellSignal}
        cachedPrice={cachedPrice}
        action={recordSellAction}
      />
    </div>
  )
}
