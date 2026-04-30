import { getAllTickersWithCounts } from '@/services/ticker'
import { addTickerAction, deleteTickerAction } from './actions'
import { TickerManager } from '@/components/tickers/TickerManager'

export default function TickersPage() {
  const tickers = getAllTickersWithCounts()
  return (
    <TickerManager
      tickers={tickers}
      addAction={addTickerAction}
      deleteAction={deleteTickerAction}
    />
  )
}
