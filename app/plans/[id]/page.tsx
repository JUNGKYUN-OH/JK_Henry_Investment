export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlanById } from '@/services/plan'
import { getTransactionsByPlanId } from '@/services/transaction'
import { PlanDetail } from '@/components/plans/PlanDetail'
import { DailyEntryForm } from '@/components/plans/DailyEntryForm'
import { recordDailyEntryAction, deletePlanAction } from './actions'
import { formatUSD, formatQty } from '@/lib/format'

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const plan = await getPlanById(id)
  if (!plan) notFound()

  const transactions = await getTransactionsByPlanId(id)
  const totalFee = transactions.reduce((sum, tx) => sum + tx.fee, 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/plans" className="text-sm text-muted-foreground hover:text-foreground">
          ← 투자 계획
        </Link>
      </div>

      <PlanDetail
        plan={plan}
        totalFee={totalFee}
        deleteAction={plan.status === 'completed' ? deletePlanAction.bind(null, plan.id) : undefined}
      />

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
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {transactions
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="px-4 py-2 tabular-nums">{tx.date}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatQty(tx.quantity)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatUSD(tx.price)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {formatUSD(tx.fee)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatUSD(tx.quantity * tx.price)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {tx.type === 'buy' && (
                          <Link
                            href={`/plans/${id}/transactions/${tx.id}/edit`}
                            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                          >
                            수정
                          </Link>
                        )}
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
