export type IndexData = {
  index_name: 'KOSPI' | 'KOSDAQ' | 'KPI200'
  price: number
  change: number
  change_rate: number
}

export type WatchlistItem = {
  id: string
  user_id: string
  symbol: string
  name: string
  is_favorite: boolean
  created_at: string
}

export type ForeignTrading = {
  id: string
  symbol: string
  trade_date: string
  net_buy: number
  created_at: string
}

export type User = {
  id: string
  kakao_id: string
  email: string | null
  nickname: string | null
  created_at: string
}

export type StockPrice = {
  symbol: string
  name: string
  price: number
  change: number
  change_rate: number
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }
