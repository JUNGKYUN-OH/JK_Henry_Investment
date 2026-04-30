'use server'

import { revalidatePath } from 'next/cache'
import { upsertManualPrice } from '@/services/price'
import { tickerExists } from '@/services/ticker'

export async function saveManualPricesAction(
  entries: { tickerId: string; price: number }[]
): Promise<void> {
  for (const { tickerId, price } of entries) {
    if (price > 0 && (await tickerExists(tickerId))) await upsertManualPrice(tickerId, price)
  }
  revalidatePath('/')
}
