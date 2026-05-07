'use client'

import { useState } from 'react'

export default function CrawlButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleCrawl = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/crawl', { method: 'POST' })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const label =
    status === 'loading' ? '실행 중...' : status === 'done' ? '완료 ✓' : status === 'error' ? '실패 ✕' : '실행 ↗'

  return (
    <button
      onClick={handleCrawl}
      disabled={status === 'loading'}
      style={{
        fontSize: '12px',
        color: status === 'error' ? 'var(--color-up)' : 'var(--color-primary)',
        background: 'none',
        border: `0.5px solid ${status === 'error' ? 'var(--color-up)' : 'var(--color-primary)'}`,
        borderRadius: '6px',
        padding: '3px 8px',
        cursor: status === 'loading' ? 'wait' : 'pointer',
        opacity: status === 'loading' ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}
