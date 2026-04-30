'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import type { createPlanAction } from '@/app/plans/actions'
import type { Ticker } from '@/types'

interface Props {
  tickers: Ticker[]
  action: typeof createPlanAction
}

export function PlanNewForm({ tickers, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {})

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
          <select
            id="tickerId"
            name="tickerId"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">선택...</option>
            {tickers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="totalAmount">총 투자금액 ($)</FieldLabel>
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            step="any"
            min="1"
            placeholder="예: 4000"
          />
        </Field>
      </FieldGroup>

      <p className="text-xs text-muted-foreground">
        입력한 금액을 40일로 나눠 일별 매수 금액이 자동 계산됩니다.
      </p>

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
