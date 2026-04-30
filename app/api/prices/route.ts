import { NextRequest, NextResponse } from 'next/server'
import { getAllTickers } from '@/services/ticker'
import { fetchAndCachePrices } from '@/services/price'

export async function POST(_request: NextRequest) {
  const tickers = (await getAllTickers()).map((t) => t.id)
  const { results, anyError } = await fetchAndCachePrices(tickers)
  return NextResponse.json({ results, anyError }, { status: anyError ? 207 : 200 })
}
