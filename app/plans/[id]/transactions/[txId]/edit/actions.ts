'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { updateTransaction } from '@/services/transaction'
import { isDuplicateDate } from '@/services/plan'
import { getTransactionById } from '@/services/transaction'

export interface EditTxResult {
  error?: string
}

export async function editTransactionAction(
  txId: string,
  _prevState: EditTxResult,
  formData: FormData
): Promise<EditTxResult> {
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

  const tx = await getTransactionById(txId)
  if (!tx || tx.type !== 'buy' || !tx.planId) return { error: '매수 내역을 찾을 수 없습니다.' }

  if (await isDuplicateDate(tx.planId, date, txId)) {
    return { error: '해당 날짜에 이미 매수 기록이 있습니다.' }
  }

  try {
    await updateTransaction(txId, { date, quantity, price, fee })
  } catch (err) {
    return { error: err instanceof Error ? err.message : '수정 저장 실패' }
  }

  revalidatePath(`/plans/${tx.planId}`)
  revalidatePath('/')
  redirect(`/plans/${tx.planId}`)
}
