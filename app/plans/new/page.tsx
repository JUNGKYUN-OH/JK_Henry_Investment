import { getAllTickers } from '@/services/ticker'
import { PlanNewForm } from '@/components/plans/PlanNewForm'
import { createPlanAction } from '../actions'

export default async function PlanNewPage() {
  const tickers = await getAllTickers()

  return (
    <div className="p-6 max-w-sm">
      <h1 className="text-xl font-semibold mb-6">새 투자 계획</h1>
      <PlanNewForm tickers={tickers} action={createPlanAction} />
    </div>
  )
}
