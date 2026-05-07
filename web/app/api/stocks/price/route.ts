import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import { getStockPrice } from '@/lib/kis/client'  // TODO: KIS API 연동 후 복원
import type { ApiResponse, StockPrice } from '@/types/database'

// ─── MOCK: KIS API 미연결 임시 데이터 ───────────────────────────────────────
const MOCK_PRICES: Record<string, Omit<StockPrice, 'symbol'>> = {
  '035720': { name: '카카오',    price: 39850,  change: -350,  change_rate: -0.87 },
  '066570': { name: 'LG전자',   price: 71200,  change: 800,   change_rate: 1.14  },
  '051910': { name: 'LG화학',   price: 198500, change: -2500, change_rate: -1.24 },
  '105560': { name: 'KB금융',   price: 89300,  change: 1200,  change_rate: 1.36  },
  '005930': { name: '삼성전자', price: 57800,  change: 400,   change_rate: 0.70  },
  '000660': { name: 'SK하이닉스',price: 194500, change: 3500,  change_rate: 1.83  },
  '035420': { name: 'NAVER',    price: 162000, change: -1500, change_rate: -0.92 },
  '950210': { name: '프레스티지바이오파마', price: 8420, change: -130, change_rate: -1.52 },
}

function getMockPrice(symbol: string): StockPrice {
  const base = MOCK_PRICES[symbol]
  if (!base) throw new Error(`Unknown symbol: ${symbol}`)
  // 소폭 랜덤 변동 (±0.3%)
  const jitter = 1 + (Math.random() - 0.5) * 0.006
  const price = Math.round(base.price * jitter)
  const change = Math.round(base.change * jitter)
  const change_rate = parseFloat((base.change_rate * jitter).toFixed(2))
  return { symbol, name: base.name, price, change, change_rate }
}
// ─────────────────────────────────────────────────────────────────────────────

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

    // ── MOCK ──────────────────────────────────────────────────────────────────
    const data: StockPrice[] = symbolList.map((s) => getMockPrice(s))
    return NextResponse.json<ApiResponse<StockPrice[]>>({ success: true, data })
    // ── 원본 (KIS API 연동 후 아래로 교체) ───────────────────────────────────
    // const results = await Promise.allSettled(symbolList.map((s) => getStockPrice(s)))
    // const data: StockPrice[] = results
    //   .filter((r): r is PromiseFulfilledResult<StockPrice> => r.status === 'fulfilled')
    //   .map((r) => r.value)
    // return NextResponse.json<ApiResponse<StockPrice[]>>({ success: true, data })
    // ─────────────────────────────────────────────────────────────────────────
  } catch (error) {
    console.error('[KIS] 시세 조회 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '시세 조회 실패' }, { status: 500 })
  }
}
