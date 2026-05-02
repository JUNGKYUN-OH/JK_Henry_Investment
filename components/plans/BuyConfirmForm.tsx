'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { formatUSD } from '@/lib/format'
import type { recordBuyAction, skipBuyAction } from '@/app/plans/[id]/buy/actions'

interface Props {
  planId: string
  tickerId: string
  dailyAmount: number
  cachedPrice: number | null
  action: typeof recordBuyAction
  skipAction: typeof skipBuyAction
}

export function BuyConfirmForm({ planId, tickerId, dailyAmount, cachedPrice, action, skipAction }: Props) {
  const today = new Date().toLocaleDateString('en-CA')
  const boundAction = action.bind(null, planId)
  const boundSkipAction = skipAction.bind(null, planId)
  const [state, formAction, isPending] = useActionState(boundAction, {})

  const [settled, setSettled] = useState<boolean | null>(null)
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')

  const priceNum = parseFloat(price)
  const qtyNum = parseFloat(quantity)
  const estimatedAmount = !isNaN(priceNum) && !isNaN(qtyNum) ? priceNum * qtyNum : null

  if (settled === null) {
    return (
      <div className="space-y-6">
        <div className="border rounded-lg p-4 bg-muted/20">
          <p className="text-xs text-muted-foreground mb-0.5">종목</p>
          <p className="text-lg font-semibold">{tickerId}</p>
          <p className="text-xs text-muted-foreground mt-1">회당 투자금 {formatUSD(dailyAmount)}</p>
          {cachedPrice != null && (
            <p className="text-xs text-muted-foreground mt-0.5">참고 가격 {formatUSD(cachedPrice)}</p>
          )}
        </div>

        <p className="text-sm font-medium text-center">오늘 LOC 주문이 체결됐나요?</p>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => setSettled(true)}>
            체결됨
          </Button>
          <form action={boundSkipAction} className="contents">
            <Button type="submit" variant="outline">미체결 — 건너뜀</Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="border rounded-lg p-4 bg-muted/20">
        <p className="text-xs text-muted-foreground mb-0.5">종목</p>
        <p className="text-lg font-semibold">{tickerId}</p>
        <p className="text-xs text-muted-foreground mt-1">회당 투자금 {formatUSD(dailyAmount)}</p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2 bg-destructive/5">
          {state.error}
        </p>
      )}

      <input type="hidden" name="date" value={today} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="price">체결가 ($)</FieldLabel>
          <Input
            id="price"
            name="price"
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="실제 체결가 입력"
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="quantity">체결 수량</FieldLabel>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
          />
          {estimatedAmount != null && (
            <FieldDescription>투자금: {formatUSD(estimatedAmount)}</FieldDescription>
          )}
        </Field>
        <input type="hidden" name="fee" value="0" />
      </FieldGroup>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setSettled(null)}>
          뒤로
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? '저장 중...' : '매수 기록 저장'}
        </Button>
      </div>
    </form>
  )
}
