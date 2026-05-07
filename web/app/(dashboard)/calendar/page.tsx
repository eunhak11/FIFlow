import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import StockCalendarCard from '@/components/StockCalendarCard'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, symbol, name, is_favorite FROM watchlist
     WHERE user_id = ?
     ORDER BY is_favorite DESC, created_at ASC`,
    [session!.user.id]
  )

  const items = (rows as RowDataPacket[]).map((r) => ({
    id: String(r.id),
    symbol: String(r.symbol),
    name: String(r.name),
    initialFavorite: Boolean(r.is_favorite),
  }))

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
        외국인 순매매 30일
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '15px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
          관심 종목을 추가하면 여기에 표시됩니다
        </div>
      ) : (
        items.map((item) => (
          <StockCalendarCard
            key={item.symbol}
            id={item.id}
            symbol={item.symbol}
            name={item.name}
            initialFavorite={item.initialFavorite}
          />
        ))
      )}
    </div>
  )
}
