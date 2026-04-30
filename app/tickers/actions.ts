'use server'

import { revalidatePath } from 'next/cache'
import { addTicker, deleteTicker, tickerExists, hasTransactions } from '@/services/ticker'

export interface ActionResult {
  error?: string
}

export async function addTickerAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = (formData.get('id') as string | null)?.toUpperCase().trim() ?? ''

  if (!id) return { error: '티커를 입력하세요.' }
  if (tickerExists(id)) return { error: '이미 등록된 티커입니다.' }

  addTicker(id)
  revalidatePath('/tickers')
  return {}
}

export async function deleteTickerAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = (formData.get('id') as string | null) ?? ''

  if (!id) return { error: '티커 ID가 없습니다.' }
  if (hasTransactions(id)) return { error: '거래 기록이 있는 종목은 삭제할 수 없습니다.' }

  deleteTicker(id)
  revalidatePath('/tickers')
  revalidatePath('/transactions')
  return {}
}
