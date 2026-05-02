'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { recordSell, getPlanById } from '@/services/plan'

export interface SellResult {
  error?: string
}

export async function recordSellAction(
  planId: string,
  _prevState: SellResult,
  formData: FormData
): Promise<SellResult> {
  const date = (formData.get('date') as string | null)?.trim() ?? ''
  const quantityRaw = formData.get('quantity') as string | null
  const priceRaw = formData.get('price') as string | null

  const quantity = quantityRaw ? parseFloat(quantityRaw) : NaN
  const price = priceRaw ? parseFloat(priceRaw) : NaN

  if (!date) return { error: '날짜를 입력하세요.' }
  if (isNaN(quantity) || quantity <= 0) return { error: '수량을 입력하세요.' }
  if (isNaN(price) || price <= 0) return { error: '매도가를 입력하세요.' }

  const plan = await getPlanById(planId)
  if (!plan) return { error: '계획을 찾을 수 없습니다.' }

  const fee = price * quantity * plan.feeRate

  try {
    await recordSell(planId, { date, quantity, price, fee })
  } catch (err) {
    return { error: err instanceof Error ? err.message : '매도 저장 실패' }
  }

  revalidatePath('/')
  redirect('/')
}
