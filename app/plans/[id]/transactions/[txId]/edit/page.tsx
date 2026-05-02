export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTransactionById } from '@/services/transaction'
import { EditTransactionForm } from '@/components/plans/EditTransactionForm'
import { editTransactionAction } from './actions'

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string; txId: string }>
}) {
  const { id, txId } = await params
  const tx = await getTransactionById(txId)

  if (!tx || tx.type !== 'buy' || tx.planId !== id) notFound()

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href={`/plans/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← 계획 상세
        </Link>
      </div>

      <h1 className="text-lg font-semibold mb-1">매수 내역 수정</h1>
      <p className="text-sm text-muted-foreground mb-6">{tx.date} · {tx.tickerId}</p>

      <EditTransactionForm tx={tx} action={editTransactionAction} />
    </div>
  )
}
