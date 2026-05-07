import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import LogoutButton from '@/components/LogoutButton'
import CrawlButton from '@/components/CrawlButton'

export const dynamic = 'force-dynamic'

export default async function MyPage() {
  const session = await getServerSession(authOptions)

  const [statsRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as total, SUM(is_favorite) as favorites FROM watchlist WHERE user_id = ?',
    [session!.user.id]
  )

  const stats = statsRows[0] as RowDataPacket
  const total = Number(stats.total ?? 0)
  const favorites = Number(stats.favorites ?? 0)

  const displayName = session!.user.name ?? '사용자'
  const email = session!.user.email ?? ''
  const initial = displayName.charAt(0).toUpperCase()

  const S = {
    card: {
      background: 'var(--card-bg)',
      borderRadius: '12px',
      border: '0.5px solid var(--border)',
      padding: '10px 12px',
    } as React.CSSProperties,
    label: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' } as React.CSSProperties,
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
  }

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* 프로필 */}
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--avatar-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '17px', fontWeight: 500, color: 'var(--avatar-text)', flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>{displayName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{email}</div>
        </div>
      </div>

      {/* 통계 */}
      <div style={S.card}>
        <div style={S.label}>관심 종목 현황</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'var(--stats-bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-primary)' }}>{total}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>관심 종목</div>
          </div>
          <div style={{ background: 'var(--stats-bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-star)' }}>{favorites}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>즐겨찾기</div>
          </div>
        </div>
      </div>

      {/* 설정 */}
      <div style={S.card}>
        <div style={S.label}>설정</div>
        <div style={{ ...S.row, paddingBottom: '8px', borderBottom: '0.5px solid var(--border)', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text)' }}>시세 갱신 주기</span>
          <span style={{ fontSize: '13px', color: 'var(--color-primary)' }}>30초</span>
        </div>
        <div style={S.row}>
          <span style={{ fontSize: '14px', color: 'var(--text)' }}>크롤링 수동 실행</span>
          <CrawlButton />
        </div>
      </div>

      <LogoutButton />
    </div>
  )
}
