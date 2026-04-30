import { getAllTickersWithCounts } from '@/services/ticker'
import { addTickerAction, deleteTickerAction } from './actions'
import { TickerManager } from '@/components/tickers/TickerManager'

export default async function TickersPage() {
  const tickers = await getAllTickersWithCounts()
  return (
    <TickerManager
      tickers={tickers}
      addAction={addTickerAction}
      deleteAction={deleteTickerAction}
    />
  )
}
