import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'
import { formatUSD, formatPct } from '@/lib/format'
import type { PlanWithProgress } from '@/types'
import { computeSellSignal } from '@/services/plan'

interface Props {
  plans: PlanWithProgress[]
  prices: Record<string, { price: number; fetchedAt: string }>
}

export function SellBanner({ plans, prices }: Props) {
  const banners = plans.flatMap((plan) => {
    const priceInfo = prices[plan.tickerId]
    if (!priceInfo || !plan.planAvgCost) return []
    const signal = computeSellSignal(plan, priceInfo.price)
    if (!signal) return []

    let label = ''
    let detail = ''
    const pctGain = ((priceInfo.price - plan.planAvgCost) / plan.planAvgCost) * 100

    if (signal === 'full') {
      label = `${plan.tickerId} 목표가 도달 (${formatPct(pctGain)}) — 전량 매도`
      detail = `현재가 ${formatUSD(priceInfo.price)} / 목표가 ${formatUSD(plan.targetSellPrice!)}`
    } else if (signal === 'first') {
      label = `${plan.tickerId} 1차 매도 시점 (+5%) — 보유 수량의 50% 매도`
      detail = `현재가 ${formatUSD(priceInfo.price)} / 평균단가 ${formatUSD(plan.planAvgCost)}`
    } else {
      label = `${plan.tickerId} 2차 매도 시점 (${formatPct(pctGain)}) — 나머지 전량 매도`
      detail = `현재가 ${formatUSD(priceInfo.price)} / 목표가 ${formatUSD(plan.targetSellPrice!)}`
    }

    return [{ plan, signal, label, detail }]
  })

  if (banners.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {banners.map(({ plan, label, detail }) => (
        <Alert key={plan.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <TrendingUp className="size-4 shrink-0 mt-0.5 text-green-600" />
            <div className="min-w-0">
              <AlertDescription className="font-medium text-sm">{label}</AlertDescription>
              <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href={`/plans/${plan.id}/sell`}>매도하기</Link>
          </Button>
        </Alert>
      ))}
    </div>
  )
}
