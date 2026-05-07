'use client'

import Link from 'next/link'
import { useWatchlistStore } from '@/store/watchlistStore'
import WatchlistCard from '@/components/WatchlistCard'

export default function WatchlistTable() {
  const items = useWatchlistStore((s) => s.items)
  const sorted = [...items].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite))

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '15px', marginBottom: '8px' }}>관심 종목이 없습니다</p>
        <Link
          href="/watchlist"
          style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
        >
          종목 추가하기 →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {sorted.map((item) => (
        <WatchlistCard key={item.id} item={item} />
      ))}
    </div>
  )
}
