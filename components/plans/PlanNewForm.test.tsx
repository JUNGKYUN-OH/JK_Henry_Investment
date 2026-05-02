import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanNewForm } from './PlanNewForm'

const tickers = [{ id: 'TQQQ', createdAt: '2024-01-01' }]
const noop = vi.fn().mockResolvedValue({})

describe('PlanNewForm', () => {
  it('renders splits field with default value 40', () => {
    render(<PlanNewForm tickers={tickers} action={noop} />)
    const splitsInput = screen.getByLabelText(/분할 횟수/i)
    expect((splitsInput as HTMLInputElement).value).toBe('40')
  })

  it('renders targetReturn field with default value 10', () => {
    render(<PlanNewForm tickers={tickers} action={noop} />)
    const trInput = screen.getByLabelText(/목표 수익률/i)
    expect((trInput as HTMLInputElement).value).toBe('10')
  })

  it('shows daily amount preview when totalAmount and splits are filled', () => {
    render(<PlanNewForm tickers={tickers} action={noop} />)
    const amtInput = screen.getByLabelText(/총 투자금/i)
    const splitsInput = screen.getByLabelText(/분할 횟수/i)
    fireEvent.change(amtInput, { target: { value: '4000' } })
    fireEvent.change(splitsInput, { target: { value: '40' } })
    expect(screen.getByText(/\$100\.00/)).toBeTruthy()
  })

  it('daily amount recalculates when splits changes', () => {
    render(<PlanNewForm tickers={tickers} action={noop} />)
    const amtInput = screen.getByLabelText(/총 투자금/i)
    const splitsInput = screen.getByLabelText(/분할 횟수/i)
    fireEvent.change(amtInput, { target: { value: '2000' } })
    fireEvent.change(splitsInput, { target: { value: '20' } })
    expect(screen.getByText(/\$100\.00/)).toBeTruthy()
  })
})
