import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getIndexPrices } from '@/lib/kis/client'

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
          const data = await getIndexPrices()
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // KIS API 오류 시 조용히 넘김
        }
      }

      send()
      intervalId = setInterval(send, 5000)
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
