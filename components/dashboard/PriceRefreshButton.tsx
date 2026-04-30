'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PriceResult {
  tickerId: string
  price: number | null
  error?: string
}

interface Props {
  lastFetchedAt?: string | null
}

export function PriceRefreshButton({ lastFetchedAt }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedTickers, setFailedTickers] = useState<string[]>([])
  const router = useRouter()

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    setFailedTickers([])

    try {
      const res = await fetch('/api/prices', { method: 'POST' })
      const data = (await res.json()) as { results: PriceResult[]; anyError: boolean }

      if (data.anyError) {
        const failed = data.results.filter((r) => r.error).map((r) => r.tickerId)
        setFailedTickers(failed)
        setError('현재가를 불러오지 못했습니다.')
      }

      router.refresh()
    } catch {
      setError('현재가를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          현재가 새로고침
        </Button>
        {lastFetchedAt && !loading && !error && (
          <span className="text-xs text-muted-foreground">
            최종 업데이트:{' '}
            {new Date(lastFetchedAt).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
          {failedTickers.length > 0 && ` (${failedTickers.join(', ')})`}
        </p>
      )}
    </div>
  )
}
