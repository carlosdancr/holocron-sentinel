'use client'

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
})

const STORAGE_KEY = 'holocron-theme'

// Store externo para evitar setState dentro de useEffect
let currentTheme: Theme = 'light'
const listeners = new Set<() => void>()

function getTheme(): Theme {
  return currentTheme
}

function getServerTheme(): Theme {
  return 'light'
}

function setThemeExternal(next: Theme) {
  if (next === currentTheme) return
  currentTheme = next
  document.documentElement.classList.toggle('dark', next === 'dark')
  localStorage.setItem(STORAGE_KEY, next)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Inicializa no client antes do primeiro render
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') {
    currentTheme = stored
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    currentTheme = 'dark'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme)

  // Sincroniza a classe no <html> quando o tema muda
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeExternal(currentTheme === 'light' ? 'dark' : 'light')
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
