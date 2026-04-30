'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createTransaction, getTransactionById, updateTransaction, deleteTransaction } from '@/services/transaction'
import { calcCurrentQuantity } from '@/services/portfolio'

export interface TransactionFormState {
  errors?: {
    tickerId?: string
    type?: string
    date?: string
    quantity?: string
    price?: string
    sell?: string
  }
}

export async function createTransactionAction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const tickerId = (formData.get('tickerId') as string | null)?.trim() ?? ''
  const type = (formData.get('type') as string | null) as 'buy' | 'sell' | null
  const date = (formData.get('date') as string | null)?.trim() ?? ''
  const quantityStr = (formData.get('quantity') as string | null)?.trim() ?? ''
  const priceStr = (formData.get('price') as string | null)?.trim() ?? ''
  const feeStr = (formData.get('fee') as string | null)?.trim() ?? ''

  const errors: TransactionFormState['errors'] = {}

  if (!tickerId) errors.tickerId = '티커를 선택하세요.'
  if (!type || (type !== 'buy' && type !== 'sell')) errors.type = '매수/매도를 선택하세요.'
  if (!date) errors.date = '날짜를 입력하세요.'
  else if (isNaN(Date.parse(date))) errors.date = '올바른 날짜를 입력하세요.'

  const quantity = parseFloat(quantityStr)
  const price = parseFloat(priceStr)
  const fee = feeStr ? parseFloat(feeStr) : 0

  if (!quantityStr) errors.quantity = '수량을 입력하세요.'
  else if (isNaN(quantity) || quantity <= 0) errors.quantity = '0보다 큰 값을 입력하세요.'

  if (!priceStr) errors.price = '단가를 입력하세요.'
  else if (isNaN(price) || price <= 0) errors.price = '0보다 큰 값을 입력하세요.'

  if (Object.keys(errors).length > 0) return { errors }

  if (type === 'sell' && tickerId) {
    const currentQty = calcCurrentQuantity(tickerId)
    if (quantity > currentQty) return { errors: { sell: '보유 수량을 초과합니다.' } }
  }

  createTransaction({ tickerId, type: type!, date, quantity, price, fee: isNaN(fee) ? 0 : fee })
  revalidatePath('/')
  revalidatePath('/transactions')
  redirect('/transactions')
}

export async function updateTransactionAction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const id = (formData.get('id') as string | null) ?? ''
  const existing = getTransactionById(id)
  if (!existing) return { errors: { tickerId: '거래를 찾을 수 없습니다.' } }

  const type = (formData.get('type') as string | null) as 'buy' | 'sell' | null
  const date = (formData.get('date') as string | null)?.trim() ?? ''
  const quantityStr = (formData.get('quantity') as string | null)?.trim() ?? ''
  const priceStr = (formData.get('price') as string | null)?.trim() ?? ''
  const feeStr = (formData.get('fee') as string | null)?.trim() ?? ''

  const errors: TransactionFormState['errors'] = {}
  if (!type || (type !== 'buy' && type !== 'sell')) errors.type = '매수/매도를 선택하세요.'
  if (!date) errors.date = '날짜를 입력하세요.'
  else if (isNaN(Date.parse(date))) errors.date = '올바른 날짜를 입력하세요.'

  const quantity = parseFloat(quantityStr)
  const price = parseFloat(priceStr)
  const fee = feeStr ? parseFloat(feeStr) : 0

  if (!quantityStr) errors.quantity = '수량을 입력하세요.'
  else if (isNaN(quantity) || quantity <= 0) errors.quantity = '0보다 큰 값을 입력하세요.'
  if (!priceStr) errors.price = '단가를 입력하세요.'
  else if (isNaN(price) || price <= 0) errors.price = '0보다 큰 값을 입력하세요.'

  if (Object.keys(errors).length > 0) return { errors }

  if (type === 'sell') {
    // Exclude the existing transaction's quantity from the baseline before comparing
    const currentQty = calcCurrentQuantity(existing.tickerId)
    const baselineQty =
      existing.type === 'sell' ? currentQty + existing.quantity : currentQty - existing.quantity
    if (quantity > baselineQty) return { errors: { sell: '보유 수량을 초과합니다.' } }
  }

  updateTransaction(id, { type: type!, date, quantity, price, fee: isNaN(fee) ? 0 : fee })
  revalidatePath('/')
  revalidatePath('/transactions')
  redirect('/transactions')
}

export async function deleteTransactionAction(id: string): Promise<void> {
  deleteTransaction(id)
  revalidatePath('/')
  revalidatePath('/transactions')
}
