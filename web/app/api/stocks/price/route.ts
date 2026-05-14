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
  '005930': { name: '삼성전자',          price: 56200,  change:  800,  change_rate:  1.44 },
  '000660': { name: 'SK하이닉스',        price: 183500, change: 2500,  change_rate:  1.38 },
  '035720': { name: '카카오',            price: 37650,  change: -450,  change_rate: -1.18 },
  '105560': { name: 'KB금융',            price: 87400,  change: 1100,  change_rate:  1.27 },
  '950210': { name: '프레스티지바이오파마', price:  8140,  change: -210,  change_rate: -2.51 },
}

function getDemoPrice(symbol: string): StockPrice {
  const base = DEMO_PRICES[symbol]
  if (!base) {
    // 등록된 종목이지만 데모 데이터 없는 경우 — KIS API 연동 후 자동 해결
    return { symbol, name: symbol, price: 0, change: 0, change_rate: 0 }
  }
  // 소폭 랜덤 변동 (±0.3%) — 실시간처럼 보이도록
  const jitter = 1 + (Math.random() - 0.5) * 0.006
  return {
    symbol,
    name: base.name,
    price: Math.round(base.price * jitter),
    change: Math.round(base.change * jitter),
    change_rate: parseFloat((base.change_rate * jitter).toFixed(2)),
  }
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
