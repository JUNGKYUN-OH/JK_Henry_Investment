export const dynamic = 'force-dynamic'

import { getAllPlans, getTodayBoughtPlanIds } from '@/services/plan'
import { getCachedPrices } from '@/services/price'
import { isTradingDay } from '@/lib/tradingDay'
import { HomeClient } from '@/components/home/HomeClient'

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10)

  const [allPlans, cachedPricesMap] = await Promise.all([
    getAllPlans(),
    getCachedPrices(),
  ])

  const activePlans = allPlans.filter((p) => p.status === 'active')
  const todayBoughtPlanIds = await getTodayBoughtPlanIds(
    activePlans.map((p) => p.id),
    today
  )

  const cachedPrices: Record<string, { price: number; fetchedAt: string }> = {}
  for (const [tickerId, info] of cachedPricesMap) {
    cachedPrices[tickerId] = info
  }

  return (
    <HomeClient
      initialData={{
        activePlans,
        cachedPrices,
        todayBoughtPlanIds,
        today,
        isTodayTradingDay: isTradingDay(today),
      }}
    />
  )
}
