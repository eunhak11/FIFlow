import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  let intervalId: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT index_name, price, `change`, change_rate, updated_at FROM index_data'
          )
          const typed = (rows as RowDataPacket[]).map((r) => ({
            index_name: r.index_name,
            price: Number(r.price),
            change: Number(r.change),
            change_rate: Number(r.change_rate),
            updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
          }))
          const data = JSON.stringify(typed)
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
        } catch {
          // DB 연결 오류 시 클라이언트에 알리지 않고 조용히 넘김
        }
      }

      // 즉시 1회 전송 후 1초 간격으로 폴링
      send()
      intervalId = setInterval(send, 1000)
    },
    cancel() {
      clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
