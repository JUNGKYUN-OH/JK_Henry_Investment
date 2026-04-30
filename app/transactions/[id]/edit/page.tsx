import { notFound } from 'next/navigation'
import { getTransactionById } from '@/services/transaction'
import { getAllTickersWithCounts } from '@/services/ticker'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { updateTransactionAction } from '@/app/transactions/actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTransactionPage({ params }: Props) {
  const { id } = await params
  const transaction = getTransactionById(id)
  if (!transaction) notFound()

  const tickers = getAllTickersWithCounts()

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">거래 수정</h1>
      <div className="border rounded-lg p-5 bg-card">
        <TransactionForm
          tickers={tickers}
          action={updateTransactionAction}
          defaultValues={transaction}
          submitLabel="수정 저장"
        />
      </div>
    </div>
  )
}
