import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import AddWatchlistForm from '@/components/AddWatchlistForm'
import type { WatchlistItem } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function WatchlistPage() {
  const session = await getServerSession(authOptions)

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, user_id, symbol, name, is_favorite, created_at FROM watchlist WHERE user_id = ? ORDER BY created_at DESC',
    [session!.user.id]
  )

  const initialItems: WatchlistItem[] = (rows as RowDataPacket[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    symbol: r.symbol,
    name: r.name,
    is_favorite: Boolean(r.is_favorite),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }))

  return <AddWatchlistForm initialItems={initialItems} />
}
