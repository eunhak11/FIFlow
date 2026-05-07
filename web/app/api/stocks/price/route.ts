import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStockPrice } from '@/lib/kis/client'
import type { ApiResponse, StockPrice } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 필요' }, { status: 401 })
    }

    const symbols = request.nextUrl.searchParams.get('symbols')
    if (!symbols) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: 'symbols 파라미터 필요 (쉼표 구분)' }, { status: 400 })
    }

    const symbolList = symbols.split(',').map((s) => s.trim()).filter(Boolean)

    const results = await Promise.allSettled(symbolList.map((s) => getStockPrice(s)))
    const data: StockPrice[] = results
      .filter((r): r is PromiseFulfilledResult<StockPrice> => r.status === 'fulfilled')
      .map((r) => r.value)

    return NextResponse.json<ApiResponse<StockPrice[]>>({ success: true, data })
  } catch (error) {
    console.error('[KIS] 시세 조회 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '시세 조회 실패' }, { status: 500 })
  }
}
