import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n/config'
import { writeLanguageCookie } from '@/utils/language'

export type Language = 'en' | 'zh'
export const htmlLang: Record<Language, string> = { en: 'en', zh: 'zh-CN' }

export type CardDensity = 'compact' | 'detailed'
export type SortKey =
  | 'priority'
  | 'online'
  | 'name'
  | 'region'
  | 'os'
  | 'uptime'
  | 'cpu'
  | 'mem'
  | 'disk'
  | 'up'
  | 'down'
  | 'total'
  | 'load'
  | 'rtt'

interface Preferences {
  theme: 'light' | 'dark'
  lang: Language
  view: 'grid' | 'table'
  statusViewMode: 'table' | 'card'
  cardDensity: CardDensity
  order: string[]
  orderMode: 'priority' | 'custom'
  range: '1m' | '15m' | '1h'
  sort: { key: SortKey; direction: 'asc' | 'desc' }
  setView: (view: 'grid' | 'table') => void
  setStatusViewMode: (mode: 'table' | 'card') => void
  setCardDensity: (cardDensity: CardDensity) => void
  setTheme: (theme: 'light' | 'dark') => void
  setLang: (lang: Language) => void
  setOrder: (order: string[]) => void
  resetOrder: () => void
  setRange: (range: '1m' | '15m' | '1h') => void
  setSort: (key: SortKey) => void
}

const syncThemeToDom = (theme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

const syncLangToDom = (lang: Language) => {
  const code = lang === 'zh' ? 'zh-CN' : 'en-US'
  if (typeof document !== 'undefined') {
    document.documentElement.lang = htmlLang[lang]
  }
  writeLanguageCookie(code)
  void i18n.changeLanguage(code)
}

// Read initial theme preference safely
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return 'dark'
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  }
  return 'dark'
}

const getInitialStatusViewMode = (): 'table' | 'card' => {
  if (typeof window !== 'undefined') {
    try {
      const legacy = window.localStorage.getItem('statusViewMode')
      if (legacy === 'card' || legacy === '"card"') return 'card'
    } catch {
      // ignore
    }
  }
  return 'table'
}

export const useNoisePreferences = create<Preferences>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      lang: 'zh',
      view: 'grid',
      statusViewMode: getInitialStatusViewMode(),
      cardDensity: 'compact',
      order: [],
      orderMode: 'priority',
      range: '1m',
      sort: { key: 'priority', direction: 'desc' },
      setView: (view) => set({ view }),
      setStatusViewMode: (statusViewMode) => set({ statusViewMode }),
      setCardDensity: (cardDensity) => set({ cardDensity }),
      setTheme: (theme) => {
        syncThemeToDom(theme)
        set({ theme })
      },
      setLang: (lang) => {
        syncLangToDom(lang)
        set({ lang })
      },
      setOrder: (order) => set({ order, orderMode: 'custom' }),
      resetOrder: () =>
        set({ orderMode: 'priority', sort: { key: 'priority', direction: 'desc' } }),
      setRange: (range) => set({ range }),
      setSort: (key) =>
        set((state) => ({
          sort: {
            key,
            direction:
              state.sort.key === key && state.sort.direction === 'asc'
                ? 'desc'
                : 'asc',
          },
        })),
    }),
    {
      name: 'probe-preferences',
      version: 3,
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncThemeToDom(state.theme)
          syncLangToDom(state.lang)
        }
      },
    }
  )
)

export type StatusFilter = 'all' | 'online' | 'offline'

interface Filters {
  query: string
  status: StatusFilter
  region: string
  setQuery: (query: string) => void
  setStatus: (status: StatusFilter) => void
  setRegion: (region: string) => void
  clear: () => void
}

export const useNoiseFilters = create<Filters>()((set) => ({
  query: '',
  status: 'all',
  region: 'all',
  setQuery: (query) => set({ query }),
  setStatus: (status) => set({ status }),
  setRegion: (region) => set({ region }),
  clear: () => set({ query: '', status: 'all', region: 'all' }),
}))
