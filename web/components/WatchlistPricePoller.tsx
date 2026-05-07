'use client'

import { useEffect } from 'react'
import { useWatchlistStore } from '@/store/watchlistStore'
import type { ApiResponse, StockPrice } from '@/types/database'

type WatchlistPricePollerProps = {
  symbols: string[]
}

const POLL_INTERVAL_MS = 30_000

export default function WatchlistPricePoller({ symbols }: WatchlistPricePollerProps) {
  const setPrices = useWatchlistStore((s) => s.setPrices)
  const setLoading = useWatchlistStore((s) => s.setLoading)

  useEffect(() => {
    if (symbols.length === 0) return

    const fetchPrices = async () => {
      setLoading(true)
      try {
        const query = symbols.join(',')
        const res = await fetch(`/api/stocks/price?symbols=${encodeURIComponent(query)}`)
        const json: ApiResponse<StockPrice[]> = await res.json()

        if (json.success) {
          setPrices(json.data)
        } else {
          console.error('[WatchlistPricePoller] 시세 조회 실패:', json.error)
        }
      } catch (error) {
        console.error('[WatchlistPricePoller] 네트워크 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    // 즉시 실행 후 30초 간격 폴링
    fetchPrices()
    const intervalId = setInterval(fetchPrices, POLL_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [symbols, setPrices, setLoading])

  return null
}
