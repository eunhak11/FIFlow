import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import { getStockName } from '@/lib/kis/client'  // TODO: KIS API 연동 후 복원
import type { ApiResponse } from '@/types/database'

// ─── MOCK: KIS API 미연결 임시 데이터 ───────────────────────────────────────
const MOCK_NAMES: Record<string, string> = {
  '035720': '카카오',
  '066570': 'LG전자',
  '051910': 'LG화학',
  '105560': 'KB금융',
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '035420': 'NAVER',
  '950210': '프레스티지바이오파마',
}
// ─────────────────────────────────────────────────────────────────────────────

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

    // ── MOCK ──────────────────────────────────────────────────────────────────
    const name = MOCK_NAMES[symbol]
    if (!name) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '종목을 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json<ApiResponse<{ symbol: string; name: string }>>({ success: true, data: { symbol, name } })
    // ── 원본 (KIS API 연동 후 아래로 교체) ───────────────────────────────────
    // const name = await getStockName(symbol)
    // return NextResponse.json<ApiResponse<{ symbol: string; name: string }>>({ success: true, data: { symbol, name } })
    // ─────────────────────────────────────────────────────────────────────────
  } catch (error) {
    console.error('[KIS] 종목 검색 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '종목을 찾을 수 없습니다' }, { status: 404 })
  }
}
