'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { formatUSD, formatPct } from '@/lib/format'
import type { recordSellAction, skipSellAction } from '@/app/plans/[id]/sell/actions'

interface Props {
  planId: string
  tickerId: string
  holdingQty: number
  planAvgCost: number
  feeRate: number
  sellSignal: 'full' | 'first' | 'second'
  cachedPrice: number | null
  action: typeof recordSellAction
  skipAction: typeof skipSellAction
}

function signalLabel(signal: 'full' | 'first' | 'second'): string {
  if (signal === 'full') return '전량 매도 시점'
  if (signal === 'first') return '1차 매도 시점 (보유량의 50%)'
  return '2차 매도 시점'
}

function defaultQty(signal: 'full' | 'first' | 'second', holdingQty: number): string {
  if (signal === 'first') return String(Math.round(holdingQty * 0.5))
  return String(Math.round(holdingQty))
}

function buttonLabel(signal: 'full' | 'first' | 'second'): string {
  if (signal === 'full') return '전량 매도 기록 저장'
  if (signal === 'first') return '1차 매도 기록 저장'
  return '2차 매도 기록 저장'
}

export function SellConfirmForm({
  planId, tickerId, holdingQty, planAvgCost, feeRate, sellSignal, cachedPrice, action, skipAction
}: Props) {
  const today = new Date().toLocaleDateString('en-CA')
  const boundAction = action.bind(null, planId)
  const boundSkipAction = skipAction.bind(null, planId)
  const [state, formAction, isPending] = useActionState(boundAction, {})

  const [settled, setSettled] = useState<boolean | null>(null)
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState(() => defaultQty(sellSignal, holdingQty))

  const priceNum = parseFloat(price)
  const qtyNum = parseFloat(quantity)
  const qtyError = !isNaN(qtyNum) && qtyNum > holdingQty ? '보유 수량을 초과합니다.' : null

  const fee = !isNaN(priceNum) && !isNaN(qtyNum) ? priceNum * qtyNum * feeRate : 0
  const grossPnl = !isNaN(priceNum) && !isNaN(qtyNum) ? (priceNum - planAvgCost) * qtyNum : null
  const netPnl = grossPnl != null ? grossPnl - fee : null
  const netPnlPct = netPnl != null && planAvgCost > 0 ? (netPnl / (planAvgCost * qtyNum)) * 100 : null

  if (settled === null) {
    return (
      <div className="space-y-6">
        <div className="border rounded-lg p-4 bg-muted/20">
          <p className="text-xs text-muted-foreground mb-0.5">종목</p>
          <p className="text-lg font-semibold">{tickerId}</p>
          <p className="text-xs text-muted-foreground mt-1">
            보유 수량 {Math.round(holdingQty)}주 · 평균단가 {formatUSD(planAvgCost)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{signalLabel(sellSignal)}</p>
          {cachedPrice != null && (
            <p className="text-xs text-muted-foreground mt-0.5">참고 가격 {formatUSD(cachedPrice)}</p>
          )}
        </div>

        <p className="text-sm font-medium text-center">After 지정가 주문이 체결됐나요?</p>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => setSettled(true)}>
            체결됨
          </Button>
          <form action={boundSkipAction} className="contents">
            <Button type="submit" variant="outline">미체결 — 닫기</Button>
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
        <p className="text-xs text-muted-foreground mt-1">
          보유 수량 {Math.round(holdingQty)}주 · 평균단가 {formatUSD(planAvgCost)}
          {feeRate > 0 && ` · 수수료율 ${formatPct(feeRate * 100)}`}
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
          <FieldLabel htmlFor="sell-price">체결가 ($)</FieldLabel>
          <Input
            id="sell-price"
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
        <Field data-invalid={qtyError ? true : undefined}>
          <FieldLabel htmlFor="sell-qty">체결 수량</FieldLabel>
          <Input
            id="sell-qty"
            name="quantity"
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-invalid={qtyError ? true : undefined}
            placeholder="0"
          />
          {qtyError ? (
            <FieldDescription className="text-destructive">{qtyError}</FieldDescription>
          ) : netPnl != null ? (
            <FieldDescription>
              {feeRate > 0 && <span className="text-muted-foreground">수수료 {formatUSD(fee)} · </span>}
              순 실현손익{' '}
              <span className={netPnl >= 0 ? 'text-green-600' : 'text-destructive'}>
                {formatUSD(netPnl)}
                {netPnlPct != null && ` (${formatPct(netPnlPct)})`}
              </span>
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setSettled(null)}>
          뒤로
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending || !!qtyError}>
          {isPending ? '저장 중...' : buttonLabel(sellSignal)}
        </Button>
      </div>
    </form>
  )
}
