import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import type { ApiResponse, WatchlistItem } from '@/types/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 필요' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (typeof body.is_favorite !== 'boolean') {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: 'is_favorite 필드 필요 (boolean)' }, { status: 400 })
    }

    await pool.execute(
      'UPDATE watchlist SET is_favorite = ? WHERE id = ? AND user_id = ?',
      [body.is_favorite ? 1 : 0, id, session.user.id]
    )

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, user_id, symbol, name, is_favorite, created_at FROM watchlist WHERE id = ?',
      [id]
    )
    const item = { ...rows[0], is_favorite: Boolean(rows[0].is_favorite) } as WatchlistItem

    return NextResponse.json<ApiResponse<WatchlistItem>>({ success: true, data: item })
  } catch (error) {
    console.error('[Watchlist] 즐겨찾기 업데이트 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '업데이트 실패' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 필요' }, { status: 401 })
    }

    const { id } = await params

    await pool.execute(
      'DELETE FROM watchlist WHERE id = ? AND user_id = ?',
      [id, session.user.id]
    )

    return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: { id } })
  } catch (error) {
    console.error('[Watchlist] 종목 삭제 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '삭제 실패' }, { status: 500 })
  }
}
