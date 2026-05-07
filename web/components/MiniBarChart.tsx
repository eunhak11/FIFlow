'use client'

import { useRef, useEffect, useState } from 'react'

function fmt(v: number): string {
  const k = Math.round(v / 1_000)
  return `${k >= 0 ? '+' : ''}${k.toLocaleString('ko-KR')}K`
}

export default function MiniBarChart({ data }: { data: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(220)

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth)
    }
  }, [])

  const n = data.length
  if (n === 0) return <div ref={containerRef} style={{ height: '68px', width: '100%' }} />

  const gap = 3
  const bw = Math.floor((width - gap * (n - 1)) / n)
  const maxA = Math.max(...data.map((d) => Math.abs(d)), 1)
  const maxBarH = 18
  const midY = 34

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '68px', width: '100%' }}>
      {/* 중심선 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${midY}px`,
          height: '0.5px',
          background: 'var(--border)',
        }}
      />
      {data.map((v, i) => {
        const isBuy = v >= 0
        const bh = Math.max(3, Math.round((Math.abs(v) / maxA) * maxBarH))
        const color = isBuy ? 'var(--color-up)' : 'var(--color-down)'
        const labelColor = isBuy ? 'var(--color-up)' : 'var(--color-down)'
        const x = i * (bw + gap)
        const top = isBuy ? midY - bh : midY
        const borderRadius = isBuy ? '2px 2px 0 0' : '0 0 2px 2px'
        const labelTop = isBuy ? midY - bh - 14 : midY + bh + 4

        return (
          <div key={i}>
            <div
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${top}px`,
                width: `${bw}px`,
                height: `${bh}px`,
                background: color,
                borderRadius,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${x - 4}px`,
                top: `${labelTop}px`,
                width: `${bw + 8}px`,
                fontSize: '11px',
                fontWeight: 500,
                color: labelColor,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {fmt(v)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
