export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlanList } from '@/components/plans/PlanList'
import { getAllPlans } from '@/services/plan'

export default async function PlansPage() {
  const plans = await getAllPlans()

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">투자 계획</h1>
        <Button asChild size="sm">
          <Link href="/plans/new">+ 새 계획</Link>
        </Button>
      </div>

      <PlanList plans={plans} />
    </div>
  )
}
