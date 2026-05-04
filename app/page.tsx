export const dynamic = 'force-dynamic'

import { getAllPlans, getTodayBoughtPlanIds, getTodaySellSkippedPlanIds } from '@/services/plan'
import { getCachedPrices } from '@/services/price'
import { isTradingDay } from '@/lib/tradingDay'
import { getTodayET } from '@/lib/timezone'
import { HomeClient } from '@/components/home/HomeClient'

export default async function HomePage() {
  const today = getTodayET()

  const [allPlans, cachedPricesMap] = await Promise.all([
    getAllPlans(),
    getCachedPrices(),
  ])

  const activePlans = allPlans.filter((p) => p.status === 'active')
  const activePlanIds = activePlans.map((p) => p.id)
  const [todayBoughtPlanIds, todaySellSkippedPlanIds] = await Promise.all([
    getTodayBoughtPlanIds(activePlanIds, today),
    getTodaySellSkippedPlanIds(activePlanIds, today),
  ])

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
        todaySellSkippedPlanIds,
        today,
        isTodayTradingDay: isTradingDay(today),
      }}
    />
  )
}
