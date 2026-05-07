import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ApiResponse } from '@/types/database'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: '인증 필요' }, { status: 401 })
    }

    const adminKey = process.env.ADMIN_API_KEY
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/admin/crawl/foreign`, {
      method: 'POST',
      headers: { 'X-Admin-Key': adminKey ?? '' },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('[Crawl] 실행 실패:', error)
    return NextResponse.json<ApiResponse<never>>({ success: false, error: '크롤링 실행 실패' }, { status: 500 })
  }
}
