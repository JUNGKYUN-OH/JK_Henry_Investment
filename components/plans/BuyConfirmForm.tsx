'use client'

import { useActionState, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { formatUSD } from '@/lib/format'
import type { recordBuyAction } from '@/app/plans/[id]/buy/actions'

interface Props {
  planId: string
  tickerId: string
  dailyAmount: number
  cachedPrice: number | null
  action: typeof recordBuyAction
}

export function BuyConfirmForm({ planId, tickerId, dailyAmount, cachedPrice, action }: Props) {
  const today = new Date().toLocaleDateString('en-CA')
  const boundAction = action.bind(null, planId)
  const [state, formAction, isPending] = useActionState(boundAction, {})

  const [price, setPrice] = useState(cachedPrice != null ? String(cachedPrice) : '')
  const [quantity, setQuantity] = useState(() => {
    if (cachedPrice != null && cachedPrice > 0) return (dailyAmount / cachedPrice).toFixed(6)
    return ''
  })
  const [manualQty, setManualQty] = useState(false)

  const priceNum = parseFloat(price)
  const qtyNum = parseFloat(quantity)
  const feeDefault = '0'

  useEffect(() => {
    if (!manualQty && priceNum > 0) {
      setQuantity((dailyAmount / priceNum).toFixed(6))
    }
  }, [priceNum, manualQty, dailyAmount])

  const estimatedAmount = !isNaN(priceNum) && !isNaN(qtyNum) ? priceNum * qtyNum : null

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
          <FieldLabel htmlFor="price">매수가 ($)</FieldLabel>
          <Input
            id="price"
            name="price"
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setManualQty(false)
            }}
            placeholder="0.00"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="quantity">수량</FieldLabel>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              setManualQty(true)
            }}
            placeholder="0.000000"
          />
          {estimatedAmount != null && (
            <FieldDescription>투자금: {formatUSD(estimatedAmount)}</FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="fee">수수료 ($)</FieldLabel>
          <Input
            id="fee"
            name="fee"
            type="number"
            step="any"
            min="0"
            defaultValue={feeDefault}
            placeholder="0"
          />
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '저장 중...' : '매수 완료'}
      </Button>
    </form>
  )
}
