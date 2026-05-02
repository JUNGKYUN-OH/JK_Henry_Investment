'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { formatUSD, formatPct } from '@/lib/format'
import type { recordSellAction } from '@/app/plans/[id]/sell/actions'

interface Props {
  planId: string
  tickerId: string
  holdingQty: number
  planAvgCost: number
  sellSignal: 'full' | 'first' | 'second'
  today: string
  cachedPrice: number | null
  action: typeof recordSellAction
}

function defaultQty(signal: 'full' | 'first' | 'second', holdingQty: number): string {
  if (signal === 'first') return (holdingQty * 0.5).toFixed(6)
  return holdingQty.toFixed(6)
}

function buttonLabel(signal: 'full' | 'first' | 'second'): string {
  if (signal === 'full') return '전량 매도'
  if (signal === 'first') return '1차 매도'
  return '2차 매도'
}

export function SellConfirmForm({
  planId, tickerId, holdingQty, planAvgCost, sellSignal, today, cachedPrice, action
}: Props) {
  const boundAction = action.bind(null, planId)
  const [state, formAction, isPending] = useActionState(boundAction, {})

  const [price, setPrice] = useState(cachedPrice != null ? String(cachedPrice) : '')
  const [quantity, setQuantity] = useState(() => defaultQty(sellSignal, holdingQty))

  const priceNum = parseFloat(price)
  const qtyNum = parseFloat(quantity)
  const qtyError = !isNaN(qtyNum) && qtyNum > holdingQty ? '보유 수량을 초과합니다.' : null

  const realizedPnl =
    !isNaN(priceNum) && !isNaN(qtyNum) && planAvgCost > 0
      ? (priceNum - planAvgCost) * qtyNum
      : null
  const realizedPnlPct =
    realizedPnl != null && planAvgCost > 0 ? (realizedPnl / (planAvgCost * qtyNum)) * 100 : null

  return (
    <form action={formAction} className="space-y-6">
      <div className="border rounded-lg p-4 bg-muted/20">
        <p className="text-xs text-muted-foreground mb-0.5">종목</p>
        <p className="text-lg font-semibold">{tickerId}</p>
        <p className="text-xs text-muted-foreground mt-1">
          보유 수량 {holdingQty.toFixed(4)}주 · 평균단가 {formatUSD(planAvgCost)}
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2 bg-destructive/5">
          {state.error}
        </p>
      )}

      <input type="hidden" name="date" value={today} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sell-price">매도가 ($)</FieldLabel>
          <Input
            id="sell-price"
            name="price"
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field data-invalid={qtyError ? true : undefined}>
          <FieldLabel htmlFor="sell-qty">수량</FieldLabel>
          <Input
            id="sell-qty"
            name="quantity"
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-invalid={qtyError ? true : undefined}
            placeholder="0.000000"
          />
          {qtyError ? (
            <FieldDescription className="text-destructive">{qtyError}</FieldDescription>
          ) : realizedPnl != null ? (
            <FieldDescription>
              예상 실현손익{' '}
              <span className={realizedPnl >= 0 ? 'text-green-600' : 'text-destructive'}>
                {formatUSD(realizedPnl)}
                {realizedPnlPct != null && ` (${formatPct(realizedPnlPct)})`}
              </span>
            </FieldDescription>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="sell-fee">수수료 ($)</FieldLabel>
          <Input
            id="sell-fee"
            name="fee"
            type="number"
            step="any"
            min="0"
            defaultValue="0"
            placeholder="0"
          />
        </Field>
      </FieldGroup>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !!qtyError}
      >
        {isPending ? '저장 중...' : buttonLabel(sellSignal)}
      </Button>
    </form>
  )
}
