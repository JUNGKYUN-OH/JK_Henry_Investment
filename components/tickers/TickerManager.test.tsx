import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TickerManager } from './TickerManager'
import type { ActionResult } from '@/app/tickers/actions'
import type { TickerWithCount } from '@/services/ticker'

const noopAction = async (_prev: ActionResult, _fd: FormData): Promise<ActionResult> => ({})

const sampleTickers: TickerWithCount[] = [
  { id: 'SPY', createdAt: '2024-01-01', transactionCount: 0 },
  { id: 'QQQ', createdAt: '2024-01-02', transactionCount: 2 },
]

describe('TickerManager', () => {
  it('shows empty state when no tickers', () => {
    render(<TickerManager tickers={[]} addAction={noopAction} deleteAction={noopAction} />)
    expect(screen.getByText('등록된 티커가 없습니다.')).toBeInTheDocument()
  })

  it('shows ticker list', () => {
    render(<TickerManager tickers={sampleTickers} addAction={noopAction} deleteAction={noopAction} />)
    expect(screen.getByText('SPY')).toBeInTheDocument()
    expect(screen.getByText('QQQ')).toBeInTheDocument()
  })

  it('disables add button when input is empty', () => {
    render(<TickerManager tickers={[]} addAction={noopAction} deleteAction={noopAction} />)
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  it('enables add button when input has value', async () => {
    const user = userEvent.setup()
    render(<TickerManager tickers={[]} addAction={noopAction} deleteAction={noopAction} />)
    await user.type(screen.getByPlaceholderText('예: SPY'), 'VOO')
    expect(screen.getByRole('button', { name: '추가' })).toBeEnabled()
  })

  it('shows error message when addAction returns error', async () => {
    const user = userEvent.setup()
    const failAction = async (_prev: ActionResult, _fd: FormData): Promise<ActionResult> =>
      ({ error: '이미 등록된 티커입니다.' })
    render(<TickerManager tickers={[]} addAction={failAction} deleteAction={noopAction} />)
    await user.type(screen.getByPlaceholderText('예: SPY'), 'SPY')
    await user.click(screen.getByRole('button', { name: '추가' }))
    await waitFor(() => {
      expect(screen.getByText('이미 등록된 티커입니다.')).toBeInTheDocument()
    })
  })

  it('shows confirmation dialog when deleting ticker with no transactions', async () => {
    const user = userEvent.setup()
    render(<TickerManager tickers={sampleTickers} addAction={noopAction} deleteAction={noopAction} />)
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' })
    await user.click(deleteButtons[0]) // SPY — 0 transactions
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('취소')).toBeInTheDocument()
    })
  })

  it('shows error in dialog when deleting ticker that has transactions', async () => {
    const user = userEvent.setup()
    render(<TickerManager tickers={sampleTickers} addAction={noopAction} deleteAction={noopAction} />)
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' })
    await user.click(deleteButtons[1]) // QQQ — 2 transactions
    await waitFor(() => {
      expect(screen.getByText('거래 기록이 있는 종목은 삭제할 수 없습니다.')).toBeInTheDocument()
      expect(screen.queryByText('취소')).not.toBeInTheDocument()
      expect(screen.getByText('닫기')).toBeInTheDocument()
    })
  })
})
