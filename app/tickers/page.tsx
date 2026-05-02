export const dynamic = 'force-dynamic'

import { getAllTickersWithCounts } from '@/services/ticker'
import { addTickerAction, deleteTickerById } from './actions'
import { TickerManager } from '@/components/tickers/TickerManager'

export default async function TickersPage() {
  const tickers = await getAllTickersWithCounts()
  return (
    <TickerManager
      tickers={tickers}
      addAction={addTickerAction}
      deleteAction={deleteTickerById}
    />
  )
}
