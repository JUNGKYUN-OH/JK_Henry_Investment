'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ActionResult } from '@/app/tickers/actions'
import type { TickerWithCount } from '@/services/ticker'

interface Props {
  tickers: TickerWithCount[]
  addAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  deleteAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
}

export function TickerManager({ tickers, addAction, deleteAction }: Props) {
  const [addState, addFormAction, addPending] = useActionState(addAction, {})
  const [, deleteFormAction, deletePending] = useActionState(deleteAction, {})
  const [inputValue, setInputValue] = useState('')
  const [tickerToDelete, setTickerToDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteClick = (tickerId: string, hasTransactions: boolean) => {
    if (hasTransactions) {
      setDeleteError('거래 기록이 있는 종목은 삭제할 수 없습니다.')
      setTickerToDelete(tickerId)
    } else {
      setDeleteError(null)
      setTickerToDelete(tickerId)
    }
  }

  const handleDialogClose = () => {
    setTickerToDelete(null)
    setDeleteError(null)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">티커 관리</h1>

      <form action={addFormAction} className="mb-8">
        <FieldGroup>
          <Field data-invalid={!!addState.error || undefined}>
            <FieldLabel htmlFor="ticker-input">티커 추가</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="ticker-input"
                name="id"
                placeholder="예: SPY"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                aria-invalid={!!addState.error}
                className="font-mono"
              />
              <Button type="submit" disabled={!inputValue.trim() || addPending}>
                추가
              </Button>
            </div>
            {addState.error && <FieldError>{addState.error}</FieldError>}
          </Field>
        </FieldGroup>
      </form>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">등록된 종목</h2>
        {tickers.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 티커가 없습니다.</p>
        ) : (
          <ul className="divide-y border rounded-md">
            {tickers.map((ticker) => (
              <li key={ticker.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{ticker.id}</span>
                    {ticker.exchange && (
                      <span className="text-xs text-muted-foreground">{ticker.exchange}</span>
                    )}
                  </div>
                  {ticker.name && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{ticker.name}</p>
                  )}
                  {ticker.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ticker.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    진행 중 {ticker.activePlanCount}건 · 완료 {ticker.completedPlanCount}건
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(ticker.id, ticker.activePlanCount + ticker.completedPlanCount > 0)}
                >
                  삭제
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!tickerToDelete} onOpenChange={(open) => !open && handleDialogClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tickerToDelete} 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError
                ? deleteError
                : `${tickerToDelete} 티커를 목록에서 제거합니다. 이 작업은 되돌릴 수 없습니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogClose}>
              {deleteError ? '닫기' : '취소'}
            </AlertDialogCancel>
            {!deleteError && (
              <form action={deleteFormAction}>
                <input type="hidden" name="id" value={tickerToDelete ?? ''} />
                <Button type="submit" variant="destructive" disabled={deletePending} onClick={handleDialogClose}>
                  삭제
                </Button>
              </form>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
