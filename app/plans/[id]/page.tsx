import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlanById } from '@/services/plan'
import { getAllTransactions } from '@/services/transaction'
import { PlanDetail } from '@/components/plans/PlanDetail'
import { DailyEntryForm } from '@/components/plans/DailyEntryForm'
import { recordDailyEntryAction } from './actions'
import { formatUSD } from '@/lib/format'

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const plan = getPlanById(id)
  if (!plan) notFound()

  const transactions = getAllTransactions().filter((tx) => tx.planId === id)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/plans" className="text-sm text-muted-foreground hover:text-foreground">
          ← 투자 계획
        </Link>
      </div>

      <PlanDetail plan={plan} />

      {plan.status === 'active' && (
        <section className="mt-8">
          <h2 className="text-sm font-medium mb-4">일별 매수 기록</h2>
          <DailyEntryForm planId={plan.id} action={recordDailyEntryAction} />
        </section>
      )}

      {transactions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium mb-3">매수 내역</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">날짜</th>
                  <th className="text-right px-4 py-2 font-medium">수량</th>
                  <th className="text-right px-4 py-2 font-medium">매수가</th>
                  <th className="text-right px-4 py-2 font-medium">수수료</th>
                  <th className="text-right px-4 py-2 font-medium">금액</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="px-4 py-2 tabular-nums">{tx.date}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{tx.quantity}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatUSD(tx.price)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {formatUSD(tx.fee)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatUSD(tx.quantity * tx.price)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
