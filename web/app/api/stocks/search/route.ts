import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStockName } from '@/lib/kis/client'
import type { ApiResponse } from '@/types/database'

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

    const name = await getStockName(symbol)
    return NextResponse.json<ApiResponse<{ symbol: string; name: string }>>({ success: true, data: { symbol, name } })
  } catch (error) {
    console.error('[KIS] 종목 검색 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '종목을 찾을 수 없습니다' }, { status: 404 })
  }
}
