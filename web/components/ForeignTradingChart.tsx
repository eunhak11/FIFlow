'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

type ForeignTradingChartProps = {
  symbol: string
  name: string
  data: { trade_date: string; net_buy: number }[]
}

function formatDateLabel(tradeDate: string): string {
  // "2026-01-02" → "01/02"
  const parts = tradeDate.split('-')
  if (parts.length !== 3) return tradeDate
  return `${parts[1]}/${parts[2]}`
}

function formatVolume(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString()
}

type TooltipPayloadEntry = {
  value: number
  payload: { trade_date: string; net_buy: number }
}

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const { trade_date, net_buy } = payload[0].payload
  const isPositive = net_buy >= 0
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{trade_date}</p>
      <p className={isPositive ? 'text-red-400 font-medium' : 'text-blue-400 font-medium'}>
        {isPositive ? '+' : ''}
        {net_buy.toLocaleString()} 주
      </p>
    </div>
  )
}

export default function ForeignTradingChart({
  symbol,
  name,
  data,
}: ForeignTradingChartProps) {
  // 최신순으로 받은 데이터를 차트용으로 오래된 순서로 정렬
  const chartData = [...data].reverse()

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="mb-3">
        <p className="text-white text-sm font-medium">{name}</p>
        <p className="text-gray-500 text-xs">{symbol} · 외국인 순매매 (최근 8거래일)</p>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="trade_date"
            tickFormatter={formatDateLabel}
            tick={{ fill: '#9ca3af', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatVolume}
            tick={{ fill: '#9ca3af', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={48}
            unit="주"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="net_buy" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.net_buy >= 0 ? '#ef4444' : '#3b82f6'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
