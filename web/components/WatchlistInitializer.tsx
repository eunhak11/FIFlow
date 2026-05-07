'use client'

import { useEffect } from 'react'
import { useWatchlistStore } from '@/store/watchlistStore'
import type { WatchlistItem } from '@/types/database'

export default function WatchlistInitializer({ items }: { items: WatchlistItem[] }) {
  const setItems = useWatchlistStore((s) => s.setItems)
  useEffect(() => {
    setItems(items)
  }, [items, setItems])
  return null
}
