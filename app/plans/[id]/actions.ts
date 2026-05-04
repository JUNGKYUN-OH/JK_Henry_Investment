'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { recordDailyEntry, isDuplicateDate, deletePlan, updatePlanSettings } from '@/services/plan'

export interface EntryResult {
  error?: string
  success?: boolean
}

export async function recordDailyEntryAction(
  planId: string,
  _prevState: EntryResult,
  formData: FormData
): Promise<EntryResult> {
  const date = (formData.get('date') as string | null)?.trim() ?? ''
  const quantityRaw = formData.get('quantity') as string | null
  const priceRaw = formData.get('price') as string | null
  const feeRaw = formData.get('fee') as string | null

  const quantity = quantityRaw ? parseFloat(quantityRaw) : NaN
  const price = priceRaw ? parseFloat(priceRaw) : NaN
  const fee = feeRaw ? parseFloat(feeRaw) : NaN

  if (!date) return { error: '날짜를 입력하세요.' }
  if (isNaN(quantity) || quantity <= 0) return { error: '수량을 입력하세요.' }
  if (isNaN(price) || price <= 0) return { error: '매수가를 입력하세요.' }
  if (isNaN(fee) || fee < 0) return { error: '수수료를 입력하세요.' }

  if (await isDuplicateDate(planId, date)) {
    return { error: '해당 날짜에 이미 매수 기록이 있습니다.' }
  }

  try {
    await recordDailyEntry(planId, { date, quantity, price, fee })
  } catch (err) {
    return { error: err instanceof Error ? err.message : '기록 저장 실패' }
  }

  revalidatePath(`/plans/${planId}`)
  return { success: true }
}

export async function deletePlanAction(planId: string): Promise<void> {
  await deletePlan(planId)
  revalidatePath('/plans')
  redirect('/plans')
}

export interface UpdateSettingsResult {
  error?: string
}

export async function updatePlanSettingsAction(
  planId: string,
  _prevState: UpdateSettingsResult,
  formData: FormData
): Promise<UpdateSettingsResult> {
  const totalAmountRaw = formData.get('totalAmount') as string | null
  const feeRateRaw = formData.get('feeRate') as string | null

  const totalAmount = totalAmountRaw ? parseFloat(totalAmountRaw) : NaN
  const feeRate = feeRateRaw ? parseFloat(feeRateRaw) / 100 : NaN

  if (isNaN(totalAmount) || totalAmount <= 0) return { error: '총 투자금을 입력하세요.' }
  if (isNaN(feeRate) || feeRate < 0) return { error: '수수료율은 0 이상이어야 합니다.' }

  try {
    await updatePlanSettings(planId, { totalAmount, feeRate })
  } catch (err) {
    return { error: err instanceof Error ? err.message : '저장 실패' }
  }

  revalidatePath(`/plans/${planId}`)
  return {}
}
