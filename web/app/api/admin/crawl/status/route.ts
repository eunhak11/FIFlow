import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import type { ApiResponse } from '@/types/database'

type CrawlStatus = {
  last_trade_date: string | null
  total_records: number
  last_updated_at: string | null
}

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 실패' }, { status: 401 })
  }

  try {
    const [[countRow], [latestRow]] = await Promise.all([
      pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM foreign_trading'),
      pool.execute<RowDataPacket[]>(
        'SELECT trade_date, created_at FROM foreign_trading ORDER BY trade_date DESC LIMIT 1'
      ),
    ])

    const latest = latestRow[0] ?? null

    return NextResponse.json<ApiResponse<CrawlStatus>>({
      success: true,
      data: {
        last_trade_date: latest?.trade_date instanceof Date
          ? latest.trade_date.toISOString().slice(0, 10)
          : (latest?.trade_date as string | null) ?? null,
        total_records: countRow[0]?.total as number ?? 0,
        last_updated_at: latest?.created_at instanceof Date
          ? latest.created_at.toISOString()
          : (latest?.created_at as string | null) ?? null,
      },
    })
  } catch (error) {
    console.error('[Admin] 크롤링 상태 조회 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '상태 조회 실패' }, { status: 500 })
  }
}
