'use client'

import { useState } from 'react'
import { useWatchlistStore } from '@/store/watchlistStore'
import type { ApiResponse, WatchlistItem, StockPrice } from '@/types/database'

type SearchResult = {
  symbol: string
  name: string
  price?: number
  change?: number
  change_rate?: number
}

export default function AddWatchlistForm({ initialItems }: { initialItems: WatchlistItem[] }) {
  const [symbol, setSymbol] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [addError, setAddError] = useState('')
  const [items, setItems] = useState<WatchlistItem[]>(initialItems)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const addItem = useWatchlistStore((s) => s.addItem)
  const removeItem = useWatchlistStore((s) => s.removeItem)

  const handleSearch = async () => {
    const trimmed = symbol.trim()
    if (!trimmed) return
    setIsSearching(true)
    setSearchError('')
    setResult(null)

    try {
      const [nameRes, priceRes] = await Promise.all([
        fetch(`/api/stocks/search?symbol=${encodeURIComponent(trimmed)}`),
        fetch(`/api/stocks/price?symbols=${encodeURIComponent(trimmed)}`),
      ])
      const nameJson: ApiResponse<{ symbol: string; name: string }> = await nameRes.json()
      const priceJson: ApiResponse<StockPrice[]> = await priceRes.json()

      if (!nameJson.success) {
        setSearchError(nameJson.error)
        return
      }

      const priceData = priceJson.success ? priceJson.data[0] : undefined
      setResult({
        symbol: nameJson.data.symbol,
        name: nameJson.data.name,
        price: priceData?.price,
        change: priceData?.change,
        change_rate: priceData?.change_rate,
      })
    } catch {
      setSearchError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!result) return
    setIsAdding(true)
    setAddError('')

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: result.symbol }),
      })
      const json: ApiResponse<WatchlistItem> = await res.json()

      if (!json.success) {
        setAddError(json.error)
        return
      }

      addItem(json.data)
      setItems((prev) => [json.data, ...prev])
      setResult(null)
      setSymbol('')
    } catch {
      setAddError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
      if (res.ok) {
        removeItem(id)
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  const confirmTarget = items.find((i) => i.id === confirmDeleteId)
  const isUp = result?.change !== undefined ? result.change > 0 : null
  const isDown = result?.change !== undefined ? result.change < 0 : null

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 삭제 확인 모달 */}
      {confirmDeleteId && confirmTarget && (
        <div
          onClick={() => setConfirmDeleteId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)',
              borderRadius: 14,
              padding: '22px 24px',
              margin: '0 28px',
              width: '100%',
              maxWidth: 320,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>종목 삭제</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              <strong style={{ color: 'var(--text)' }}>{confirmTarget.name}</strong>을(를) 관심 종목에서 삭제하시겠습니까?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: '0.5px solid var(--border)',
                  background: 'none', color: 'var(--text-muted)', fontSize: 15, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const id = confirmDeleteId
                  setConfirmDeleteId(null)
                  await handleDelete(id)
                }}
                disabled={deletingId === confirmDeleteId}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                  background: 'var(--color-up)', color: '#fff', fontSize: 15,
                  fontWeight: 500, cursor: 'pointer',
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 종목 추가 */}
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>종목 코드 입력</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={symbol}
            onChange={(e) => { setSymbol(e.target.value); setSearchError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            placeholder="예) 005930"
            disabled={isSearching}
            style={{
              flex: 1,
              fontSize: '14px',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '0.5px solid var(--input-border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !symbol.trim()}
            style={{
              fontSize: '13px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--color-primary)',
              color: '#050505',
              border: 'none',
              cursor: isSearching || !symbol.trim() ? 'not-allowed' : 'pointer',
              opacity: isSearching || !symbol.trim() ? 0.5 : 1,
            }}
          >
            {isSearching ? '조회 중' : '검색'}
          </button>
        </div>
        {searchError && (
          <p style={{ fontSize: '13px', color: 'var(--color-up)', marginTop: '4px' }}>{searchError}</p>
        )}
      </div>

      {/* 검색 결과 */}
      {result && (
        <>
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1.5px solid var(--color-primary)',
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>{result.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{result.symbol}</div>
              </div>
              {result.price !== undefined && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>
                    {result.price.toLocaleString()}
                  </div>
                  {result.change_rate !== undefined && (
                    <div style={{ fontSize: '12px', color: isUp ? 'var(--color-up)' : isDown ? 'var(--color-down)' : 'var(--text-muted)' }}>
                      {result.change_rate > 0 ? '+' : ''}{result.change_rate.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isAdding}
            style={{
              width: '100%',
              background: 'var(--color-primary)',
              color: '#050505',
              border: 'none',
              borderRadius: '10px',
              padding: '11px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: isAdding ? 'wait' : 'pointer',
              opacity: isAdding ? 0.7 : 1,
            }}
          >
            {isAdding ? '추가 중...' : '관심 종목에 추가'}
          </button>
          {addError && (
            <p style={{ fontSize: '13px', color: 'var(--color-up)', marginTop: '-8px' }}>{addError}</p>
          )}
        </>
      )}

      {/* 관심 종목 관리 */}
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          관심 종목 관리 ({items.length})
        </div>
        {items.length === 0 ? (
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            등록된 종목이 없습니다
          </div>
        ) : (
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '0.5px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {items.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderBottom: i < items.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{item.symbol}</div>
                </div>
                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  disabled={deletingId === item.id}
                  style={{
                    fontSize: '13px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'none',
                    border: '0.5px solid var(--border)',
                    color: 'var(--text-muted)',
                    cursor: deletingId === item.id ? 'wait' : 'pointer',
                    opacity: deletingId === item.id ? 0.4 : 1,
                  }}
                >
                  {deletingId === item.id ? '...' : '삭제'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
