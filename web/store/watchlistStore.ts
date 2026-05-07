'use client'

import { create } from 'zustand'
import type { WatchlistItem, StockPrice } from '@/types/database'

type WatchlistStore = {
  items: WatchlistItem[]
  prices: Record<string, StockPrice>
  isLoading: boolean
  setItems: (items: WatchlistItem[]) => void
  setPrices: (prices: StockPrice[]) => void
  addItem: (item: WatchlistItem) => void
  removeItem: (id: string) => void
  toggleFavorite: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useWatchlistStore = create<WatchlistStore>((set) => ({
  items: [],
  prices: {},
  isLoading: false,

  setItems: (items) => set({ items }),

  setPrices: (prices) =>
    set({
      prices: Object.fromEntries(prices.map((p) => [p.symbol, p])),
    }),

  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  toggleFavorite: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, is_favorite: !i.is_favorite } : i
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),
}))
