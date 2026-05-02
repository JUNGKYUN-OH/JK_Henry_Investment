'use client'

import { useActionState, useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, AlertTriangle } from 'lucide-react'
import type { ActionResult } from '@/app/tickers/actions'
import type { TickerWithCount } from '@/services/ticker'

interface Props {
  tickers: TickerWithCount[]
  addAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  deleteAction: (id: string) => Promise<ActionResult>
}

export function TickerManager({ tickers, addAction, deleteAction }: Props) {
  const [addState, addFormAction, addPending] = useActionState(addAction, {})
  const [inputValue, setInputValue] = useState('')

  const [tickerToDelete, setTickerToDelete] = useState<TickerWithCount | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasPlan = (t: TickerWithCount) => t.activePlanCount + t.completedPlanCount > 0

  const handleDeleteClick = (ticker: TickerWithCount) => {
    setDeleteError(null)
    setTickerToDelete(ticker)
  }

  const handleConfirmDelete = () => {
    if (!tickerToDelete) return
    startTransition(async () => {
      const result = await deleteAction(tickerToDelete.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setTickerToDelete(null)
        setDeleteError(null)
      }
    })
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !isPending) {
      setTickerToDelete(null)
      setDeleteError(null)
    }
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
              <li key={ticker.id} className="flex items-start justify-between px-4 py-3 gap-3">
                <div className="min-w-0 flex-1">
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
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteClick(ticker)}
                >
                  삭제
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!tickerToDelete} onOpenChange={handleDialogClose}>
        <AlertDialogContent size="sm">
          {deleteError ? (
            <>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <AlertTriangle className="text-yellow-500" />
                </AlertDialogMedia>
                <AlertDialogTitle>삭제할 수 없습니다</AlertDialogTitle>
                <AlertDialogDescription>{deleteError}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleDialogClose(false)}>닫기</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <Trash2 className="text-destructive" />
                </AlertDialogMedia>
                <AlertDialogTitle>{tickerToDelete?.id} 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  {hasPlan(tickerToDelete!)
                    ? `투자 계획(진행 중 ${tickerToDelete!.activePlanCount}건, 완료 ${tickerToDelete!.completedPlanCount}건)이 있는 종목은 삭제할 수 없습니다.`
                    : '티커를 목록에서 영구적으로 제거합니다. 이 작업은 되돌릴 수 없습니다.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
                {hasPlan(tickerToDelete!) ? null : (
                  <AlertDialogAction
                    variant="destructive"
                    disabled={isPending}
                    onClick={(e) => {
                      e.preventDefault()
                      handleConfirmDelete()
                    }}
                  >
                    {isPending ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
