'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TransactionFormState } from '@/app/transactions/actions'
import type { TickerWithCount } from '@/services/ticker'
import type { Transaction } from '@/types'

interface Props {
  tickers: TickerWithCount[]
  action: (prev: TransactionFormState, formData: FormData) => Promise<TransactionFormState>
  defaultValues?: Partial<Transaction>
  submitLabel?: string
}

export function TransactionForm({ tickers, action, defaultValues, submitLabel = '저장' }: Props) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-0">
      <FieldGroup>
        <Field data-invalid={!!state.errors?.tickerId || undefined}>
          <FieldLabel htmlFor="tickerId">종목</FieldLabel>
          <Select name="tickerId" defaultValue={defaultValues?.tickerId}>
            <SelectTrigger id="tickerId" aria-invalid={!!state.errors?.tickerId}>
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
          {state.errors?.tickerId && <FieldError>{state.errors.tickerId}</FieldError>}
        </Field>

        <Field data-invalid={!!state.errors?.type || undefined}>
          <FieldLabel htmlFor="type">구분</FieldLabel>
          <Select name="type" defaultValue={defaultValues?.type ?? 'buy'}>
            <SelectTrigger id="type" aria-invalid={!!state.errors?.type}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="buy">매수</SelectItem>
                <SelectItem value="sell">매도</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {state.errors?.type && <FieldError>{state.errors.type}</FieldError>}
        </Field>

        <Field data-invalid={!!state.errors?.date || undefined}>
          <FieldLabel htmlFor="date">날짜</FieldLabel>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={defaultValues?.date}
            aria-invalid={!!state.errors?.date}
          />
          {state.errors?.date && <FieldError>{state.errors.date}</FieldError>}
        </Field>

        <Field data-invalid={!!state.errors?.quantity || undefined}>
          <FieldLabel htmlFor="quantity">수량</FieldLabel>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            placeholder="0"
            defaultValue={defaultValues?.quantity}
            aria-invalid={!!state.errors?.quantity}
          />
          {state.errors?.quantity && <FieldError>{state.errors.quantity}</FieldError>}
        </Field>

        <Field data-invalid={!!state.errors?.price || undefined}>
          <FieldLabel htmlFor="price">단가 ($)</FieldLabel>
          <Input
            id="price"
            name="price"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            defaultValue={defaultValues?.price}
            aria-invalid={!!state.errors?.price}
          />
          {state.errors?.price && <FieldError>{state.errors.price}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="fee">수수료 ($)</FieldLabel>
          <Input
            id="fee"
            name="fee"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            defaultValue={defaultValues?.fee ?? 0}
          />
        </Field>

        {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

        {state.errors?.sell && (
          <p role="alert" className="text-sm text-destructive">
            {state.errors.sell}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
