import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ApiResponse, StockPrice } from '@/types/database'

// ┌─────────────────────────────────────────────────────────────────────────┐
// │  DEMO 모드 — KIS API 연동 전 임시 데이터                                 │
// │  실제 연동 시: 아래 DEMO 블록 전체 제거 후 하단 주석 해제                  │
// └─────────────────────────────────────────────────────────────────────────┘

// import { getStockPrice } from '@/lib/kis/client'

const DEMO_PRICES: Record<string, Omit<StockPrice, 'symbol'>> = {
  '005930': { name: '삼성전자',           price:  296000, change:  12000, change_rate:  4.23 },
  '000660': { name: 'SK하이닉스',         price: 1970000, change:  -6000, change_rate: -0.30 },
  '035720': { name: '카카오',             price:   45950, change:   3000, change_rate:  6.98 },
  '105560': { name: 'KB금융',             price:  156000, change:   4000, change_rate:  2.63 },
  '950210': { name: '프레스티지바이오파마', price:    7890, change:    170, change_rate:  2.20 },
  '005380': { name: '현대차',             price:  712000, change:   2000, change_rate:  0.28 },
}

function getDemoPrice(symbol: string): StockPrice {
  const base = DEMO_PRICES[symbol]
  if (!base) {
    // 등록된 종목이지만 데모 데이터 없는 경우 — KIS API 연동 후 자동 해결
    return { symbol, name: symbol, price: 0, change: 0, change_rate: 0 }
  }
  return { symbol, ...base }
}

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

    // ── DEMO ──────────────────────────────────────────────────────────────────
    const data: StockPrice[] = symbolList.map(getDemoPrice)
    return NextResponse.json<ApiResponse<StockPrice[]>>({ success: true, data })
    // ── KIS API 연동 후 위 두 줄 제거하고 아래 주석 해제 ─────────────────────
    // const results = await Promise.allSettled(symbolList.map((s) => getStockPrice(s)))
    // const data: StockPrice[] = results
    //   .filter((r): r is PromiseFulfilledResult<StockPrice> => r.status === 'fulfilled')
    //   .map((r) => r.value)
    // return NextResponse.json<ApiResponse<StockPrice[]>>({ success: true, data })
    // ─────────────────────────────────────────────────────────────────────────
  } catch (error) {
    console.error('[stocks/price] 조회 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '시세 조회 실패' }, { status: 500 })
  }
}
