'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

interface Props {
  tickerIds: string[]
  saveAction: (data: { tickerId: string; price: number }[]) => Promise<void>
}

export function ManualPriceInput({ tickerIds, saveAction }: Props) {
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (tickerIds.length === 0) return null

  const handleSave = () => {
    const entries = tickerIds
      .map((id) => ({ tickerId: id, price: parseFloat(prices[id] ?? '') }))
      .filter((e) => !isNaN(e.price) && e.price > 0)

    if (entries.length === 0) return
    startTransition(async () => {
      await saveAction(entries)
      router.refresh()
    })
  }

  return (
    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5 space-y-4">
      <p className="text-sm font-medium text-destructive">수동 현재가 입력</p>
      <FieldGroup>
        {tickerIds.map((id) => (
          <Field key={id} orientation="horizontal">
            <FieldLabel htmlFor={`manual-price-${id}`} className="w-16 font-mono">
              {id}
            </FieldLabel>
            <Input
              id={`manual-price-${id}`}
              type="number"
              step="any"
              min="0"
              placeholder="현재가 ($)"
              value={prices[id] ?? ''}
              onChange={(e) => setPrices((prev) => ({ ...prev, [id]: e.target.value }))}
              className="max-w-40"
            />
          </Field>
        ))}
      </FieldGroup>
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        확인
      </Button>
    </div>
  )
}
