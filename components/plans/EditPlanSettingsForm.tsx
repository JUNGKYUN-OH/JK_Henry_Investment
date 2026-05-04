'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Pencil } from 'lucide-react'
import type { updatePlanSettingsAction } from '@/app/plans/[id]/actions'

interface Props {
  planId: string
  totalAmount: number
  feeRate: number
  action: typeof updatePlanSettingsAction
}

export function EditPlanSettingsForm({ planId, totalAmount, feeRate, action }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isEditing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
        <Pencil className="size-3.5" />
        설정 편집
      </Button>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await action(planId, {}, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setIsEditing(false)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
      <p className="text-sm font-medium">설정 편집</p>

      {error && (
        <p className="text-xs text-destructive border border-destructive/30 rounded px-3 py-2 bg-destructive/5">
          {error}
        </p>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="totalAmount">총 투자금 ($)</FieldLabel>
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            step="any"
            min="0"
            defaultValue={totalAmount}
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="feeRate">매도 수수료율 (%)</FieldLabel>
          <Input
            id="feeRate"
            name="feeRate"
            type="number"
            step="any"
            min="0"
            defaultValue={(feeRate * 100).toFixed(2)}
          />
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setIsEditing(false)}
          disabled={isPending}
        >
          취소
        </Button>
        <Button type="submit" size="sm" className="flex-1" disabled={isPending}>
          {isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}
