import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ApiResponse } from '@/types/database'

const execFileAsync = promisify(execFile)

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
    const pythonBin = '/var/www/html/fiflow/crawler/venv/bin/python3'
    const script = '/var/www/html/fiflow/crawler/foreign_crawler.py'

    const { stdout, stderr } = await execFileAsync(pythonBin, [script], {
      cwd: '/var/www/html/fiflow/crawler',
      timeout: 120000,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    const output = stdout + stderr
    const upsertMatches = output.match(/upsert/g) ?? []
    const count = upsertMatches.length

    console.log('[Crawler] Python output:', output)

    return NextResponse.json<ApiResponse<CrawlResult>>({
      success: true,
      data: {
        success: true,
        duration_ms: Date.now() - startAt,
        count,
        message: `${count}개 종목 크롤링 완료`,
      },
    })
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
    console.error('[Crawler] Failed:', err.message, err.stderr)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: `크롤링 실패: ${err.message}` },
      { status: 500 }
    )
  }
}
