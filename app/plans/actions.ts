'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createPlan } from '@/services/plan'

export interface ActionResult {
  error?: string
}

export async function createPlanAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const tickerId = (formData.get('tickerId') as string | null)?.trim() ?? ''
  const totalAmountRaw = formData.get('totalAmount') as string | null
  const totalAmount = totalAmountRaw ? parseFloat(totalAmountRaw) : NaN

  if (!tickerId) return { error: '종목을 선택하세요.' }
  if (isNaN(totalAmount) || totalAmount <= 0) return { error: '총 투자금액을 입력하세요.' }

  try {
    await createPlan(tickerId, totalAmount)
  } catch (err) {
    return { error: err instanceof Error ? err.message : '계획 생성 실패' }
  }

  revalidatePath('/plans')
  redirect('/plans')
}
