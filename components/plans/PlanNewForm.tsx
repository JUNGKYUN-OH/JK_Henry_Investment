'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { createPlanAction } from '@/app/plans/actions'
import type { Ticker } from '@/types'

interface Props {
  tickers: Ticker[]
  action: typeof createPlanAction
}

export function PlanNewForm({ tickers, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {})
  const [totalAmount, setTotalAmount] = useState('')
  const [splits, setSplits] = useState('40')

  const dailyAmount =
    totalAmount && splits && Number(splits) > 0
      ? Number(totalAmount) / Number(splits)
      : null

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2 bg-destructive/5">
          {state.error}
        </p>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="tickerId">종목</FieldLabel>
          <Select name="tickerId">
            <SelectTrigger id="tickerId">
              <SelectValue placeholder="종목 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {tickers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.id}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="totalAmount">총 투자금액 ($)</FieldLabel>
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            step="any"
            min="0.01"
            placeholder="예: 4000"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="splits">분할 횟수</FieldLabel>
          <Input
            id="splits"
            name="splits"
            type="number"
            step="1"
            min="1"
            placeholder="기본값: 40"
            value={splits}
            onChange={(e) => setSplits(e.target.value)}
          />
          <FieldDescription>정수만 입력 가능 (기본값: 40)</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="targetReturn">목표 수익률 (%)</FieldLabel>
          <Input
            id="targetReturn"
            name="targetReturn"
            type="number"
            step="any"
            min="0.01"
            placeholder="기본값: 10"
            defaultValue="10"
          />
          <FieldDescription>0보다 큰 값 (기본값: 10%)</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="feeRate">매도 수수료율 (%)</FieldLabel>
          <Input
            id="feeRate"
            name="feeRate"
            type="number"
            step="any"
            min="0"
            placeholder="예: 0.1"
            defaultValue="0"
          />
          <FieldDescription>매도 시 자동 적용 (기본값: 0%)</FieldDescription>
        </Field>
      </FieldGroup>

      {dailyAmount != null && dailyAmount > 0 && (
        <p className="text-sm text-muted-foreground">
          회당 투자금: <span className="font-medium text-foreground">${dailyAmount.toFixed(2)}</span>
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          계획 생성
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          취소
        </Button>
      </div>
    </form>
  )
}
