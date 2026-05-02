'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { SellBanner } from './SellBanner'
import { TodayTaskList } from './TodayTaskList'
import { PlanList } from '@/components/plans/PlanList'
import { computeSellSignal } from '@/lib/sellSignal'
import type { PlanWithProgress } from '@/types'

type PriceMap = Record<string, { price: number; fetchedAt: string }>

interface HomeData {
  activePlans: PlanWithProgress[]
  cachedPrices: PriceMap
  todayBoughtPlanIds: string[]
  today: string
  isTodayTradingDay: boolean
}

interface PriceResult {
  tickerId: string
  price: number | null
  error?: string
}

export function HomeClient({ initialData }: { initialData: HomeData }) {
  const { activePlans, cachedPrices, todayBoughtPlanIds, isTodayTradingDay } = initialData

  const [prices, setPrices] = useState<PriceMap>(cachedPrices)
  const [loading, setLoading] = useState(true)
  const [priceError, setPriceError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/prices', { method: 'POST' })
      .then((res) => res.json())
      .then((data: { results: PriceResult[]; anyError: boolean }) => {
        if (cancelled) return
        const updated: PriceMap = { ...cachedPrices }
        for (const r of data.results) {
          if (r.price != null) {
            updated[r.tickerId] = { price: r.price, fetchedAt: new Date().toISOString() }
          }
        }
        setPrices(updated)
        if (data.anyError) setPriceError(true)
      })
      .catch(() => {
        if (!cancelled) setPriceError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasSellSignals = !loading && activePlans.some((plan) => {
    const priceInfo = prices[plan.tickerId]
    return priceInfo != null && plan.planAvgCost != null && computeSellSignal(plan, priceInfo.price) !== null
  })

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto">

      {/* Price fetch error */}
      {priceError && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            현재가를 불러오지 못했습니다. 캐시된 가격을 표시합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 오늘의 할 일 */}
      <section>
        <h2 className="text-sm font-semibold mb-3">오늘의 할 일</h2>

        <div className="flex flex-col gap-4">
          {/* 매수하기 */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">매수하기</h3>
            {loading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : (
              <TodayTaskList
                plans={activePlans}
                todayBoughtPlanIds={todayBoughtPlanIds}
                isTradingDay={isTodayTradingDay}
                prices={prices}
                loading={loading}
                priceError={priceError}
              />
            )}
          </div>

          {/* 매도하기 */}
          {hasSellSignals && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">매도하기</h3>
              <SellBanner plans={activePlans} prices={prices} />
            </div>
          )}
        </div>
      </section>

      {/* 진행 중인 계획 */}
      {activePlans.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3">진행 중인 계획</h2>
          <PlanList plans={activePlans} />
        </section>
      )}
    </div>
  )
}
