'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatUSD, formatQty, formatDate } from '@/lib/format'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
  deleteAction: (id: string) => Promise<void>
}

export function TransactionList({ transactions, deleteAction }: Props) {
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!txToDelete) return
    startTransition(async () => {
      await deleteAction(txToDelete.id)
      setTxToDelete(null)
    })
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">거래 기록이 없습니다.</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-left">
              <th className="py-2 pr-4 font-medium">날짜</th>
              <th className="py-2 pr-4 font-medium">종목</th>
              <th className="py-2 pr-4 font-medium">구분</th>
              <th className="py-2 pr-4 font-medium text-right">수량</th>
              <th className="py-2 pr-4 font-medium text-right">단가</th>
              <th className="py-2 pr-4 font-medium text-right">수수료</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b last:border-0 group">
                <td className="py-3 pr-4 text-muted-foreground">{formatDate(tx.date)}</td>
                <td className="py-3 pr-4 font-mono font-medium">{tx.tickerId}</td>
                <td className="py-3 pr-4">
                  <span
                    className={
                      tx.type === 'buy' ? 'text-blue-600 font-medium' : 'text-orange-600 font-medium'
                    }
                  >
                    {tx.type === 'buy' ? '매수' : '매도'}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatQty(tx.quantity)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatUSD(tx.price)}</td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                  {tx.fee > 0 ? formatUSD(tx.fee) : '—'}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button asChild variant="ghost" size="icon" className="size-7">
                      <Link href={`/transactions/${tx.id}/edit`}>
                        <Pencil className="size-3.5" />
                        <span className="sr-only">수정</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => setTxToDelete(tx)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">삭제</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {txToDelete &&
                `${txToDelete.tickerId} ${txToDelete.type === 'buy' ? '매수' : '매도'} ${formatQty(txToDelete.quantity)}주 @ ${formatUSD(txToDelete.price)} 거래를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTxToDelete(null)}>취소</AlertDialogCancel>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              삭제
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
