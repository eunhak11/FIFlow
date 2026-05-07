'use client'

import { useEffect, useState } from 'react'
import type { IndexData } from '@/types/database'

function IndexCard({ data }: { data: IndexData }) {
  const { index_name, price, change, change_rate } = data
  const p = Number(price)
  const c = Number(change)
  const cr = Number(change_rate)
  const isUp = c > 0
  const isDown = c < 0
  const sign = isUp ? '+' : ''
  const color = isUp ? 'var(--color-up)' : isDown ? 'var(--color-down)' : 'var(--text-muted)'

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '10px 10px 8px',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'inline-block',
            flexShrink: 0,
            animation: 'pulse 1.5s infinite',
          }}
        />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em' }}>
          {index_name}
        </span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>
        {p.toLocaleString()}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color }}>
        {isUp ? '▲' : isDown ? '▼' : ''} {sign}{cr.toFixed(2)}%
      </div>
    </div>
  )
}

export default function IndexSSEProvider({ initialData }: { initialData: IndexData[] }) {
  const [indices, setIndices] = useState<IndexData[]>(initialData)

  useEffect(() => {
    const es = new EventSource('/api/sse/index')
    es.onmessage = (e) => {
      try {
        setIndices(JSON.parse(e.data))
      } catch {
        // 파싱 실패 무시
      }
    }
    return () => es.close()
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
      {indices.map((index) => (
        <IndexCard key={index.index_name} data={index} />
      ))}
    </div>
  )
}
