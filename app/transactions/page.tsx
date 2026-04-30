import Link from 'next/link'
import { getAllTickersWithCounts } from '@/services/ticker'
import { getAllTransactions } from '@/services/transaction'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { createTransactionAction } from './actions'
import { formatUSD, formatDate } from '@/lib/format'

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
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">거래 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-2 pr-4 font-medium">날짜</th>
                  <th className="py-2 pr-4 font-medium">종목</th>
                  <th className="py-2 pr-4 font-medium">구분</th>
                  <th className="py-2 pr-4 font-medium text-right">수량</th>
                  <th className="py-2 pr-4 font-medium text-right">단가</th>
                  <th className="py-2 font-medium text-right">수수료</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(tx.date)}</td>
                    <td className="py-3 pr-4 font-mono font-medium">{tx.tickerId}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          tx.type === 'buy'
                            ? 'text-blue-600 font-medium'
                            : 'text-orange-600 font-medium'
                        }
                      >
                        {tx.type === 'buy' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{tx.quantity}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatUSD(tx.price)}</td>
                    <td className="py-3 text-right tabular-nums text-muted-foreground">
                      {tx.fee > 0 ? formatUSD(tx.fee) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
