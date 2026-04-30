'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import type { recordDailyEntryAction } from '@/app/plans/[id]/actions'

interface Props {
  planId: string
  action: typeof recordDailyEntryAction
}

export function DailyEntryForm({ planId, action }: Props) {
  const boundAction = action.bind(null, planId)
  const [state, formAction, isPending] = useActionState(boundAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [state.success, router])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2 bg-destructive/5">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 border border-green-300 rounded-md px-3 py-2 bg-green-50">
          매수 기록이 저장되었습니다.
        </p>
      )}

      <FieldGroup>
        <Field orientation="horizontal">
          <FieldLabel htmlFor="date" className="w-20">날짜</FieldLabel>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={today}
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
            placeholder="0"
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
            placeholder="0.00"
            className="max-w-40"
          />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel htmlFor="fee" className="w-20">수수료 ($)</FieldLabel>
          <Input
            id="fee"
            name="fee"
            type="number"
            step="any"
            min="0"
            defaultValue="0"
            className="max-w-40"
          />
        </Field>
      </FieldGroup>

      <Button type="submit" size="sm" disabled={isPending}>
        기록
      </Button>
    </form>
  )
}
