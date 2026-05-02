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
  const splitsRaw = formData.get('splits') as string | null
  const targetReturnRaw = formData.get('targetReturn') as string | null

  const totalAmount = totalAmountRaw ? parseFloat(totalAmountRaw) : NaN
  const splits = splitsRaw ? parseInt(splitsRaw, 10) : 40
  const targetReturn = targetReturnRaw ? parseFloat(targetReturnRaw) / 100 : 0.1

  if (!tickerId) return { error: '종목을 선택하세요.' }
  if (isNaN(totalAmount) || totalAmount <= 0) return { error: '총 투자금액을 입력하세요.' }
  if (isNaN(splits) || splits < 1 || !Number.isInteger(splits)) {
    return { error: '분할 횟수는 1 이상의 정수를 입력하세요.' }
  }
  if (isNaN(targetReturn) || targetReturn <= 0) {
    return { error: '목표 수익률은 0보다 큰 값을 입력하세요.' }
  }

  try {
    await createPlan(tickerId, totalAmount, splits, targetReturn)
  } catch (err) {
    return { error: err instanceof Error ? err.message : '계획 생성 실패' }
  }

  revalidatePath('/plans')
  redirect('/plans')
}
