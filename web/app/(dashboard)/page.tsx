import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import WatchlistInitializer from '@/components/WatchlistInitializer'
import WatchlistPricePoller from '@/components/WatchlistPricePoller'
import WatchlistTable from '@/components/WatchlistTable'
import IndexSection from '@/components/IndexSection'
import type { WatchlistItem } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const [watchlistRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, user_id, symbol, name, is_favorite, created_at FROM watchlist WHERE user_id = ? ORDER BY is_favorite DESC, created_at ASC',
    [session!.user.id]
  )

  const watchlist: WatchlistItem[] = (watchlistRows as RowDataPacket[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    symbol: r.symbol,
    name: r.name,
    is_favorite: Boolean(r.is_favorite),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }))

  const symbols = watchlist.map((w) => w.symbol)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <IndexSection />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>관심 종목</span>
        <WatchlistInitializer items={watchlist} />
        <WatchlistPricePoller symbols={symbols} />
        <WatchlistTable />
      </div>
    </div>
  )
}
