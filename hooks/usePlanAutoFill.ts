'use client'

import { useState, useEffect, useRef } from 'react'

interface PlanInfo {
  completedDays: number
  dailyAmount: number
}

interface AutoFillResult {
  banner: { tickerId: string; day: number; dailyAmount: number } | null
  price: string
  quantity: string
  onPriceChange: (value: string) => void
  onQuantityChange: (value: string) => void
}

export function usePlanAutoFill(
  selectedTicker: string,
  planMap: Record<string, PlanInfo>,
  priceMap: Record<string, number>
): AutoFillResult {
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const quantityManualRef = useRef(false)
  const prevTickerRef = useRef('')

  useEffect(() => {
    if (selectedTicker === prevTickerRef.current) return
    prevTickerRef.current = selectedTicker
    quantityManualRef.current = false

    const plan = planMap[selectedTicker]
    const cachedPrice = priceMap[selectedTicker]

    if (!plan) {
      setPrice('')
      setQuantity('')
      return
    }

    if (cachedPrice != null) {
      const priceStr = String(cachedPrice)
      const qty = plan.dailyAmount / cachedPrice
      setPrice(priceStr)
      setQuantity(String(Math.round(qty)))
    } else {
      setPrice('')
      setQuantity('')
    }
  }, [selectedTicker, planMap, priceMap])

  const onPriceChange = (value: string) => {
    setPrice(value)
    if (!quantityManualRef.current) {
      const plan = planMap[selectedTicker]
      const p = parseFloat(value)
      if (plan && !isNaN(p) && p > 0) {
        setQuantity(String(Math.round(plan.dailyAmount / p)))
      }
    }
  }

  const onQuantityChange = (value: string) => {
    quantityManualRef.current = true
    setQuantity(value)
  }

  const plan = planMap[selectedTicker]
  const banner = plan
    ? { tickerId: selectedTicker, day: plan.completedDays + 1, dailyAmount: plan.dailyAmount }
    : null

  return { banner, price, quantity, onPriceChange, onQuantityChange }
}
