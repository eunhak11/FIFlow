import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
// import { getStockName } from '@/lib/kis/client'  // TODO: KIS API 연동 후 복원

// ─── MOCK: KIS API 미연결 임시 종목명 조회 ───────────────────────────────────
const MOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자', '000660': 'SK하이닉스', '035720': '카카오',
  '105560': 'KB금융', '950210': '프레스티지바이오파마', '005380': '현대차',
}
async function getStockName(symbol: string): Promise<string> {
  const name = MOCK_NAMES[symbol]
  if (!name) throw new Error('등록되지 않은 종목 코드입니다')
  return name
}
// ─────────────────────────────────────────────────────────────────────────────
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import type { ApiResponse, WatchlistItem } from '@/types/database'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 필요' }, { status: 401 })
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_id, symbol, name, is_favorite, created_at
       FROM watchlist
       WHERE user_id = ?
       ORDER BY is_favorite DESC, created_at ASC`,
      [session.user.id]
    )

    const items: WatchlistItem[] = rows.map((r) => ({
      ...r,
      is_favorite: Boolean(r.is_favorite),
    })) as WatchlistItem[]

    return NextResponse.json<ApiResponse<WatchlistItem[]>>({ success: true, data: items })
  } catch (error) {
    console.error('[Watchlist] 목록 조회 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '목록 조회 실패' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 필요' }, { status: 401 })
    }

    const body = await request.json()
    const symbol: string = body.symbol?.trim()
    if (!symbol) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '종목 코드 필요' }, { status: 400 })
    }

    const name = await getStockName(symbol)

    const id = crypto.randomUUID()
    try {
      await pool.execute(
        'INSERT INTO watchlist (id, user_id, symbol, name) VALUES (?, ?, ?, ?)',
        [id, session.user.id, symbol, name]
      )
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ER_DUP_ENTRY') {
        return NextResponse.json<ApiResponse<never>>({ success: false, error: '이미 추가된 종목입니다' }, { status: 409 })
      }
      throw err
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, user_id, symbol, name, is_favorite, created_at FROM watchlist WHERE id = ?',
      [id]
    )
    const item = { ...rows[0], is_favorite: Boolean(rows[0].is_favorite) } as WatchlistItem

    return NextResponse.json<ApiResponse<WatchlistItem>>({ success: true, data: item }, { status: 201 })
  } catch (error) {
    console.error('[Watchlist] 종목 추가 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '종목 추가 실패' }, { status: 500 })
  }
}
