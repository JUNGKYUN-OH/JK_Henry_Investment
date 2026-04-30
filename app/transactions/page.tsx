import Link from 'next/link'
import { getAllTickersWithCounts } from '@/services/ticker'
import { getAllTransactions } from '@/services/transaction'
import { getAllPlans } from '@/services/plan'
import { getCachedPrices } from '@/services/price'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransactionList } from '@/components/transactions/TransactionList'
import { createTransactionAction, deleteTransactionAction } from './actions'

export default async function TransactionsPage() {
  const tickers = await getAllTickersWithCounts()
  const transactions = await getAllTransactions()

  const activePlans = (await getAllPlans()).filter((p) => p.status === 'active')
  const planMap: Record<string, { completedDays: number; dailyAmount: number }> = {}
  for (const p of activePlans) {
    planMap[p.tickerId] = { completedDays: p.completedDays, dailyAmount: p.dailyAmount }
  }

  const priceCache = await getCachedPrices()
  const priceMap: Record<string, number> = {}
  for (const [tickerId, { price }] of priceCache.entries()) {
    priceMap[tickerId] = price
  }

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
          <TransactionForm
            tickers={tickers}
            action={createTransactionAction}
            planMap={planMap}
            priceMap={priceMap}
          />
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
