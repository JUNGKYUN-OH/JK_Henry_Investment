import Link from 'next/link'
import { getAllTickersWithCounts } from '@/services/ticker'
import { getAllTransactions } from '@/services/transaction'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransactionList } from '@/components/transactions/TransactionList'
import { createTransactionAction, deleteTransactionAction } from './actions'

export default function TransactionsPage() {
  const tickers = getAllTickersWithCounts()
  const transactions = getAllTransactions()

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-6">거래 내역</h1>

      <section className="border rounded-lg p-5 mb-8 bg-card">
        <h2 className="text-sm font-medium mb-4">새 거래 추가</h2>
        {tickers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            거래를 추가하려면 먼저{' '}
            <Link href="/tickers" className="underline text-primary">
              티커를 등록
            </Link>
            하세요.
          </p>
        ) : (
          <TransactionForm tickers={tickers} action={createTransactionAction} />
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          거래 기록 ({transactions.length}건)
        </h2>
        <TransactionList transactions={transactions} deleteAction={deleteTransactionAction} />
      </section>
    </div>
  )
}
