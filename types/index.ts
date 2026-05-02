export interface Ticker {
  id: string
  createdAt: string
}

export interface Transaction {
  id: string
  tickerId: string
  type: 'buy' | 'sell'
  date: string
  quantity: number
  price: number
  fee: number
  planId: string | null
  createdAt: string
}

export interface Plan {
  id: string
  tickerId: string
  totalAmount: number
  dailyAmount: number
  splits: number
  targetReturn: number
  status: 'active' | 'completed'
  startDate: string
  createdAt: string
}

export interface PriceCache {
  tickerId: string
  price: number
  fetchedAt: string
}

export interface Holding {
  tickerId: string
  quantity: number
  avgCost: number
  totalCost: number
  currentPrice: number | null
  marketValue: number | null
  unrealizedPnl: number | null
  unrealizedPnlPct: number | null
  realizedPnl: number
  totalFee: number
}

export interface ClosedPosition {
  tickerId: string
  realizedPnl: number
  totalFee: number
}

export interface PortfolioSummary {
  totalCost: number
  marketValue: number | null
  unrealizedPnl: number | null
  realizedPnl: number
  totalFee: number
}

export interface PlanWithProgress {
  id: string
  tickerId: string
  totalAmount: number
  dailyAmount: number
  splits: number
  targetReturn: number
  status: 'active' | 'completed'
  startDate: string
  createdAt: string
  completedDays: number
  remainingAmount: number
  planAvgCost: number | null
  targetSellPrice: number | null
  firstSellCompleted: boolean
  holdingQty: number
}
