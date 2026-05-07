'use client'

import { useEffect, useState } from 'react'
import { useWatchlistStore } from '@/store/watchlistStore'
import MiniBarChart from '@/components/MiniBarChart'
import StockDetailSheet from '@/components/StockDetailSheet'
import type { WatchlistItem } from '@/types/database'

type ForeignEntry = { trade_date: string; net_buy: number }

export default function WatchlistCard({ item }: { item: WatchlistItem }) {
  const price = useWatchlistStore((s) => s.prices[item.symbol])
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite)
  const [chartData, setChartData] = useState<number[]>([])
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetch(`/api/foreign-trading?symbol=${item.symbol}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const data: number[] = [...(json.data as ForeignEntry[])].reverse().map((d) => d.net_buy)
          setChartData(data)
        }
      })
      .catch(() => {})
  }, [item.symbol])

  const handleToggle = async () => {
    toggleFavorite(item.id)
    const res = await fetch(`/api/watchlist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !item.is_favorite }),
    })
    if (!res.ok) toggleFavorite(item.id)
  }

  const isUp = price ? price.change > 0 : null
  const isDown = price ? price.change < 0 : null

  return (
    <>
      {showDetail && (
        <StockDetailSheet
          symbol={item.symbol}
          name={item.name}
          onClose={() => setShowDetail(false)}
        />
      )}
      <div
        onClick={() => setShowDetail(true)}
        style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '14px 14px 12px',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {/* 헤더: 종목명 + 가격 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{item.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggle() }}
                style={{
                  fontSize: '15px',
                  color: item.is_favorite ? 'var(--color-star)' : 'var(--border)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {item.is_favorite ? '★' : '☆'}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.symbol}</span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
              {price ? price.price.toLocaleString() : '—'}
            </div>
            {price && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: isUp ? 'var(--color-up-bg)' : isDown ? 'var(--color-down-bg)' : 'var(--stats-bg)',
                    color: isUp ? 'var(--color-up-text)' : isDown ? 'var(--color-down-text)' : 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '5px',
                  }}
                >
                  {price.change > 0 ? '+' : ''}{price.change.toLocaleString()}
                </span>
                <span style={{ fontSize: '11px', color: isUp ? 'var(--color-up)' : isDown ? 'var(--color-down)' : 'var(--text-muted)' }}>
                  {price.change_rate > 0 ? '+' : ''}{price.change_rate.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {chartData.length > 0 ? (
          <MiniBarChart data={chartData} />
        ) : (
          <div style={{ height: '50px', background: 'var(--stats-bg)', borderRadius: '4px' }} />
        )}
      </div>
    </>
  )
}
