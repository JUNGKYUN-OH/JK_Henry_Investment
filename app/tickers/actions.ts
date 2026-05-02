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
  if (id.length > 10 || !/^[A-Z0-9.\-^]+$/.test(id))
    return { error: '유효하지 않은 티커 형식입니다.' }
  if (await tickerExists(id)) return { error: '이미 등록된 티커입니다.' }

  let name: string | null = null
  let exchange: string | null = null

  try {
    const YahooFinance = (await import('yahoo-finance2')).default
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] } as never)
    const quote = await yf.quote(id, { fields: ['shortName', 'exchange', 'regularMarketPrice'] as never[] })
    const q = quote as { shortName?: string; exchange?: string; regularMarketPrice?: number }
    if (!q.regularMarketPrice) return { error: `'${id}'를 Yahoo Finance에서 찾을 수 없습니다.` }
    name = q.shortName ?? null
    exchange = q.exchange ?? null
  } catch {
    return { error: `'${id}'는 유효하지 않은 티커입니다.` }
  }

  await addTicker(id, { name, exchange })
  revalidatePath('/tickers')
  return {}
}

export async function deleteTickerAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = (formData.get('id') as string | null) ?? ''

  if (!id) return { error: '티커 ID가 없습니다.' }
  if (await hasTransactions(id)) return { error: '거래 기록이 있는 종목은 삭제할 수 없습니다.' }

  await deleteTicker(id)
  revalidatePath('/tickers')
  return {}
}
