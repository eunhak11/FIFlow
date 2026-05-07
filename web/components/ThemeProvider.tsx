'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'beige'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'dark', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) || 'dark'
    setThemeState(saved)
    document.body.setAttribute('data-theme', saved)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    document.body.setAttribute('data-theme', t)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
