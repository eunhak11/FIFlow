'use client'

import { useEffect, useState } from 'react'

type TradeEntry = { trade_date: string; net_buy: number }

function formatNetBuy(val: number): string {
  const k = Math.round(val / 1_000)
  return `${k > 0 ? '+' : ''}${k.toLocaleString('ko-KR')}K`
}

interface Props {
  symbol: string
  name: string
  onClose: () => void
}

export default function StockDetailSheet({ symbol, name, onClose }: Props) {
  const [data, setData] = useState<TradeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/foreign-trading?symbol=${symbol}&days=30`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          // API returns DESC order → reverse to oldest-first
          setData([...(json.data as TradeEntry[])].reverse())
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  // Always 30 cells; pad empty cells at the beginning if fewer days of data
  const cells: (TradeEntry | null)[] = [
    ...Array(Math.max(0, 30 - data.length)).fill(null),
    ...data,
  ]

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }}
      />

      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--card-bg)',
          borderRadius: '16px 16px 0 0',
          padding: '12px 16px 40px',
          zIndex: 51,
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 14px' }} />

        {/* Header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {symbol} · 외국인 순매매 최근 30일
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {[
            { label: '순매수', bg: 'var(--color-up-bg)', border: 'var(--color-up)' },
            { label: '순매도', bg: 'var(--color-down-bg)', border: 'var(--color-down)' },
          ].map(({ label, bg, border }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${border}` }} />
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 15 }}>
            불러오는 중...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {cells.map((entry, i) => {
              if (!entry) {
                return (
                  <div
                    key={i}
                    style={{
                      height: 48,
                      borderRadius: 6,
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
                    height: 48,
                    borderRadius: 6,
                    background: isBuy ? 'var(--color-up-bg)' : isSell ? 'var(--color-down-bg)' : 'var(--bg-subtle)',
                    border: `1px solid ${isBuy ? 'var(--color-up)' : isSell ? 'var(--color-down)' : 'var(--border)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: '6px 4px',
                  }}
                >
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1 }}>{mmdd}</div>
                  <div
                    style={{
                      fontSize: 13,
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
    </>
  )
}
