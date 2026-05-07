'use client'

import { useEffect, useState } from 'react'
import { useWatchlistStore } from '@/store/watchlistStore'

type TradeEntry = { trade_date: string; net_buy: number }

function formatNetBuy(val: number): string {
  const k = Math.round(val / 1_000)
  return `${k > 0 ? '+' : ''}${k.toLocaleString('ko-KR')}K`
}

interface Props {
  id: string
  symbol: string
  name: string
  initialFavorite: boolean
}

export default function StockCalendarCard({ id, symbol, name, initialFavorite }: Props) {
  const [data, setData] = useState<TradeEntry[]>([])
  const [loading, setLoading] = useState(true)

  const storeItem = useWatchlistStore((s) => s.items.find((i) => i.id === id))
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite)
  const isFavorite = storeItem?.is_favorite ?? initialFavorite

  const handleToggle = async () => {
    toggleFavorite(id)
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !isFavorite }),
    })
    if (!res.ok) toggleFavorite(id)
  }

  useEffect(() => {
    fetch(`/api/foreign-trading?symbol=${symbol}&days=30`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData([...(json.data as TradeEntry[])].reverse())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  const cells: (TradeEntry | null)[] = [
    ...Array(Math.max(0, 30 - data.length)).fill(null),
    ...data,
  ]

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        border: '0.5px solid var(--border)',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <button
          onClick={handleToggle}
          style={{
            fontSize: '15px',
            color: isFavorite ? 'var(--color-star)' : 'var(--border)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>{name}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{symbol}</span>
      </div>

      {loading ? (
        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>불러오는 중...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {cells.map((entry, i) => {
            if (!entry) {
              return (
                <div
                  key={i}
                  style={{
                    height: 38,
                    borderRadius: 5,
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                />
              )
            }
            const isBuy = entry.net_buy > 0
            const isSell = entry.net_buy < 0
            const mmdd = entry.trade_date.slice(5).replace('-', '/')
            return (
              <div
                key={i}
                style={{
                  height: 38,
                  borderRadius: 5,
                  background: isBuy ? 'var(--color-up-bg)' : isSell ? 'var(--color-down-bg)' : 'var(--bg-subtle)',
                  border: `1px solid ${isBuy ? 'var(--color-up)' : isSell ? 'var(--color-down)' : 'var(--border)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }}>{mmdd}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: isBuy ? 'var(--color-up-text)' : isSell ? 'var(--color-down-text)' : 'var(--text-muted)',
                  }}
                >
                  {formatNetBuy(entry.net_buy)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
