'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { isTradingDay } from '@/lib/tradingDay'
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

  const today = new Date().toLocaleDateString('en-CA')
  const [selectedDate, setSelectedDate] = useState(today)
  const nonTradingWarning = selectedDate && !isTradingDay(selectedDate)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setSelectedDate(today)
      router.refresh()
    }
  }, [state.success, router, today])

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
        <Field>
          <FieldLabel htmlFor="date">날짜</FieldLabel>
          <Input
            id="date"
            name="date"
            type="date"
            max={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-44"
          />
          {nonTradingWarning && (
            <FieldDescription className="text-amber-600">
              거래일이 아닌 날짜입니다. 소급 입력 시 확인 후 저장하세요.
            </FieldDescription>
          )}
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
        <input type="hidden" name="fee" value="0" />
      </FieldGroup>

      <Button type="submit" size="sm" disabled={isPending}>
        기록
      </Button>
    </form>
  )
}
