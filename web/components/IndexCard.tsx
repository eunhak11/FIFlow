import type { IndexData } from '@/types/database'

function isMarketOpen(): boolean {
  const now = new Date()
  const kstOffset = 9 * 60
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const kstMinutes = (utcMinutes + kstOffset) % (24 * 60)
  const kstDay = new Date(now.getTime() + kstOffset * 60 * 1000).getUTCDay()
  if (kstDay === 0 || kstDay === 6) return false
  return kstMinutes >= 540 && kstMinutes < 930  // 09:00 ~ 15:30
}

function changeColor(change: number) {
  if (change > 0) return 'text-red-500'
  if (change < 0) return 'text-blue-500'
  return 'text-gray-400'
}

export default function IndexCard({ data }: { data: IndexData }) {
  const { index_name, price, change, change_rate } = data
  const open = isMarketOpen()
  const color = changeColor(change)
  const sign = change > 0 ? '+' : ''

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1.5">
      <p className="text-xs text-gray-400 font-medium">{index_name}</p>
      <p className="text-lg font-bold text-gray-900">{price.toLocaleString()}</p>
      <p className={`text-xs font-medium ${color}`}>
        {sign}{change.toLocaleString()} ({sign}{change_rate.toFixed(2)}%)
      </p>
      <div className="mt-1">
        {open ? (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            실시간
          </span>
        ) : (
          <span className="text-xs text-gray-400">장 마감</span>
        )}
      </div>
    </div>
  )
}
