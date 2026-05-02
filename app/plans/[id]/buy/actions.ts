'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { recordDailyEntry } from '@/services/plan'

export interface BuyResult {
  error?: string
}

export async function recordBuyAction(
  planId: string,
  _prevState: BuyResult,
  formData: FormData
): Promise<BuyResult> {
  const date = (formData.get('date') as string | null)?.trim() ?? ''
  const quantityRaw = formData.get('quantity') as string | null
  const priceRaw = formData.get('price') as string | null
  const feeRaw = formData.get('fee') as string | null

  const quantity = quantityRaw ? parseFloat(quantityRaw) : NaN
  const price = priceRaw ? parseFloat(priceRaw) : NaN
  const fee = feeRaw ? parseFloat(feeRaw) : 0

  if (!date) return { error: '날짜를 입력하세요.' }
  if (isNaN(quantity) || quantity <= 0) return { error: '수량을 입력하세요.' }
  if (isNaN(price) || price <= 0) return { error: '매수가를 입력하세요.' }
  if (isNaN(fee) || fee < 0) return { error: '수수료는 0 이상이어야 합니다.' }

  try {
    await recordDailyEntry(planId, { date, quantity, price, fee })
  } catch (err) {
    return { error: err instanceof Error ? err.message : '기록 저장 실패' }
  }

  revalidatePath('/')
  redirect('/')
}
