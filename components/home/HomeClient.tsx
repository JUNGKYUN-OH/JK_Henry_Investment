'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { SellBanner } from './SellBanner'
import { TodayTaskList } from './TodayTaskList'
import { PortfolioSummary } from './PortfolioSummary'
import type { PlanWithProgress, Holding } from '@/types'

type PriceMap = Record<string, { price: number; fetchedAt: string }>

interface HomeData {
  activePlans: PlanWithProgress[]
  holdings: Holding[]
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
  const { activePlans, holdings, cachedPrices, todayBoughtPlanIds, isTodayTradingDay } = initialData

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

  // Portfolio summary from holdings + current prices
  const totalCost = holdings.reduce((acc, h) => acc + h.totalCost, 0)
  const marketValue = holdings.length > 0
    ? holdings.reduce((acc, h) => {
        const p = prices[h.tickerId]?.price
        return p != null ? acc + p * h.quantity : acc + h.totalCost
      }, 0)
    : null
  const unrealizedPnl = marketValue != null ? marketValue - totalCost : null

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto">
      {/* Sell banners */}
      {!loading && (
        <SellBanner plans={activePlans} prices={prices} />
      )}

      {/* Price fetch error */}
      {priceError && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            현재가를 불러오지 못했습니다. 캐시된 가격을 표시합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* Today's tasks */}
      <section>
        <h2 className="text-sm font-semibold mb-3">오늘의 할 일</h2>
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
      </section>

      {/* Portfolio summary */}
      {holdings.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3">포트폴리오</h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg col-span-2" />
            </div>
          ) : (
            <PortfolioSummary
              totalCost={totalCost}
              marketValue={marketValue}
              unrealizedPnl={unrealizedPnl}
            />
          )}
        </section>
      )}
    </div>
  )
}
