import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionList } from './TransactionList'
import type { Transaction } from '@/types'

const makeTx = (overrides?: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  tickerId: 'SPY',
  type: 'buy',
  date: '2024-01-15',
  quantity: 10,
  price: 450,
  fee: 2.5,
  planId: null,
  createdAt: '2024-01-15T00:00:00Z',
  ...overrides,
})

describe('TransactionList', () => {
  it('shows empty message when no transactions', () => {
    render(<TransactionList transactions={[]} deleteAction={vi.fn()} />)
    expect(screen.getByText('거래 기록이 없습니다.')).toBeInTheDocument()
  })

  it('renders transaction rows', () => {
    render(<TransactionList transactions={[makeTx()]} deleteAction={vi.fn()} />)
    expect(screen.getByText('SPY')).toBeInTheDocument()
    expect(screen.getByText('매수')).toBeInTheDocument()
  })

  it('shows confirmation dialog when delete is clicked', async () => {
    const user = userEvent.setup()
    render(<TransactionList transactions={[makeTx()]} deleteAction={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })

  it('calls deleteAction when confirmed', async () => {
    const user = userEvent.setup()
    const deleteAction = vi.fn().mockResolvedValue(undefined)
    render(<TransactionList transactions={[makeTx()]} deleteAction={deleteAction} />)
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => screen.getByRole('alertdialog'))
    await user.click(screen.getByRole('button', { name: '삭제', hidden: false }))
    await waitFor(() => {
      expect(deleteAction).toHaveBeenCalledWith('tx-1')
    })
  })

  it('does not call deleteAction when cancel is clicked', async () => {
    const user = userEvent.setup()
    const deleteAction = vi.fn()
    render(<TransactionList transactions={[makeTx()]} deleteAction={deleteAction} />)
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => screen.getByRole('alertdialog'))
    await user.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => {
      expect(deleteAction).not.toHaveBeenCalled()
    })
  })
})
