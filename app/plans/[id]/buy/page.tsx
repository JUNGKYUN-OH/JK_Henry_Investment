export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlanById } from '@/services/plan'
import { getCachedPrices } from '@/services/price'
import { BuyConfirmForm } from '@/components/plans/BuyConfirmForm'
import { recordBuyAction } from './actions'

export default async function BuyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const plan = await getPlanById(id)
  if (!plan || plan.status !== 'active') notFound()

  const cachedPricesMap = await getCachedPrices()
  const cachedPrice = cachedPricesMap.get(plan.tickerId)?.price ?? null

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← 홈
        </Link>
      </div>

      <h1 className="text-lg font-semibold mb-6">매수 확인</h1>

      <BuyConfirmForm
        planId={plan.id}
        tickerId={plan.tickerId}
        dailyAmount={plan.dailyAmount}
        cachedPrice={cachedPrice}
        action={recordBuyAction}
      />
    </div>
  )
}
