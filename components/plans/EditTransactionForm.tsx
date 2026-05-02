'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import type { editTransactionAction } from '@/app/plans/[id]/transactions/[txId]/edit/actions'
import type { Transaction } from '@/types'

interface Props {
  tx: Transaction
  action: typeof editTransactionAction
}

export function EditTransactionForm({ tx, action }: Props) {
  const boundAction = action.bind(null, tx.id)
  const [state, formAction, isPending] = useActionState(boundAction, {})

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2 bg-destructive/5">
          {state.error}
        </p>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="date">날짜</FieldLabel>
          <Input
            id="date"
            name="date"
            type="date"
            max={new Date().toLocaleDateString('en-CA')}
            defaultValue={tx.date}
            className="max-w-44"
          />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel htmlFor="quantity" className="w-20">수량</FieldLabel>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            defaultValue={tx.quantity}
            className="max-w-40"
          />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel htmlFor="price" className="w-20">매수가 ($)</FieldLabel>
          <Input
            id="price"
            name="price"
            type="number"
            step="any"
            min="0"
            defaultValue={tx.price}
            className="max-w-40"
          />
        </Field>
        <input type="hidden" name="fee" value="0" />
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? '저장 중...' : '저장'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => history.back()}>
          취소
        </Button>
      </div>
    </form>
  )
}
