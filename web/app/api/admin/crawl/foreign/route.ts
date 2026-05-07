import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import type { ApiResponse } from '@/types/database'

type CrawlResult = {
  success: boolean
  duration_ms: number
  count: number
  message: string
}

export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 실패' }, { status: 401 })
  }

  const startAt = Date.now()

  try {
    const [watchlistRows] = await pool.execute<RowDataPacket[]>('SELECT DISTINCT symbol FROM watchlist')
    const symbols = watchlistRows.map((r) => r.symbol as string)

    if (symbols.length === 0) {
      return NextResponse.json<ApiResponse<CrawlResult>>({
        success: true,
        data: { success: true, duration_ms: Date.now() - startAt, count: 0, message: '관심 종목 없음' },
      })
    }

    const results = await Promise.allSettled(symbols.map((symbol) => crawlForeignTrading(symbol)))

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failedSymbols = results
      .map((r, i) => (r.status === 'rejected' ? symbols[i] : null))
      .filter(Boolean)

    if (failedSymbols.length > 0) {
      console.error('[크롤러] 실패 종목:', failedSymbols)
    }

    return NextResponse.json<ApiResponse<CrawlResult>>({
      success: true,
      data: {
        success: failedSymbols.length === 0,
        duration_ms: Date.now() - startAt,
        count: successCount,
        message: `${successCount}/${symbols.length}개 종목 크롤링 완료`,
      },
    })
  } catch (error) {
    console.error('[크롤러] 외국인 순매매 크롤링 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '크롤링 실패' }, { status: 500 })
  }
}

async function crawlForeignTrading(symbol: string): Promise<number> {
  const url = `https://finance.naver.com/item/frgn.nhn?code=${symbol}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`네이버 금융 요청 실패: ${res.status}`)

  const arrayBuffer = await res.arrayBuffer()
  const html = new TextDecoder('euc-kr').decode(arrayBuffer)

  const rows = extractForeignTradingRows(html, symbol)
  if (rows.length === 0) return 0

  for (const row of rows) {
    await pool.execute(
      `INSERT INTO foreign_trading (id, symbol, trade_date, net_buy)
       VALUES (UUID(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE net_buy = VALUES(net_buy)`,
      [row.symbol, row.trade_date, row.net_buy]
    )
  }

  return rows.length
}

function extractForeignTradingRows(
  html: string,
  symbol: string
): { symbol: string; trade_date: string; net_buy: number }[] {
  const rows: { symbol: string; trade_date: string; net_buy: number }[] = []
  const trPattern = /<tr[^>]*>\s*<td[^>]*>(\d{2}\.\d{2}\.\d{2})<\/td>[\s\S]*?<\/tr>/g
  const tdPattern = /<td[^>]*class="[^"]*num[^"]*"[^>]*>([\s\S]*?)<\/td>/g

  let trMatch: RegExpExecArray | null
  while ((trMatch = trPattern.exec(html)) !== null) {
    const [yy, mm, dd] = trMatch[1].split('.')
    const tradeDate = `20${yy}-${mm}-${dd}`
    const nums: number[] = []
    let tdMatch: RegExpExecArray | null
    tdPattern.lastIndex = 0
    while ((tdMatch = tdPattern.exec(trMatch[0])) !== null) {
      const raw = tdMatch[1].replace(/<[^>]*>/g, '').replace(/,/g, '').trim()
      const num = parseInt(raw, 10)
      if (!isNaN(num)) nums.push(num)
    }
    if (nums.length >= 4) rows.push({ symbol, trade_date: tradeDate, net_buy: nums[3] })
    if (rows.length >= 8) break
  }
  return rows
}
