import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import type { ApiResponse } from '@/types/database'

type ForeignTradingEntry = { trade_date: string; net_buy: number }

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 필요' }, { status: 401 })
    }

    const symbol = request.nextUrl.searchParams.get('symbol')?.trim()
    if (!symbol) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: 'symbol 파라미터 필요' }, { status: 400 })
    }

    const daysParam = parseInt(request.nextUrl.searchParams.get('days') ?? '8', 10)
    const limit = isNaN(daysParam) || daysParam < 1 ? 8 : Math.min(daysParam, 30)

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT trade_date, net_buy
       FROM foreign_trading
       WHERE symbol = ?
       ORDER BY trade_date DESC
       LIMIT ${limit}`,
      [symbol]
    )

    const data: ForeignTradingEntry[] = rows.map((r) => ({
      trade_date: r.trade_date instanceof Date
        ? r.trade_date.toISOString().slice(0, 10)
        : String(r.trade_date),
      net_buy: Number(r.net_buy),
    }))

    return NextResponse.json<ApiResponse<ForeignTradingEntry[]>>({ success: true, data })
  } catch (error) {
    console.error('[ForeignTrading] 조회 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '조회 실패' }, { status: 500 })
  }
}
