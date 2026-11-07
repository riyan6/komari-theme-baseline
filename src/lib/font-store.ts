import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontFamilyKey = 'inter-tight' | 'geist' | 'space-grotesk'

export interface FontOption {
  key: FontFamilyKey
  name: string
  shortName: string
  fontFamily: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    key: 'inter-tight',
    name: 'Inter Tight',
    shortName: 'IT',
    fontFamily: '"Inter Tight Variable"',
  },
  {
    key: 'geist',
    name: 'Geist',
    shortName: 'GE',
    fontFamily: '"Geist Variable"',
  },
  {
    key: 'space-grotesk',
    name: 'Space Grotesk',
    shortName: 'SG',
    fontFamily: '"Space Grotesk Variable"',
  },
]

const loadedFonts = new Set<string>(['inter-tight'])

export const loadFontOnDemand = async (key: FontFamilyKey) => {
  if (loadedFonts.has(key)) return
  if (key === 'geist') {
    await import('@fontsource-variable/geist')
    loadedFonts.add('geist')
  } else if (key === 'space-grotesk') {
    await import('@fontsource-variable/space-grotesk')
    loadedFonts.add('space-grotesk')
  }
}

interface FontStore {
  fontFamily: FontFamilyKey
  setFontFamily: (font: FontFamilyKey) => void
  cycleFont: () => void
}

const syncFontToDom = (font: FontFamilyKey) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-font', font)
  }
  void loadFontOnDemand(font)
}

export const useFontStore = create<FontStore>()(
  persist(
    (set, get) => ({
      fontFamily: 'inter-tight',
      setFontFamily: (font) => {
        syncFontToDom(font)
        set({ fontFamily: font })
      },
      cycleFont: () => {
        const current = get().fontFamily
        const currentIndex = FONT_OPTIONS.findIndex((f) => f.key === current)
        const nextIndex = (currentIndex + 1) % FONT_OPTIONS.length
        const nextFont = FONT_OPTIONS[nextIndex].key
        syncFontToDom(nextFont)
        set({ fontFamily: nextFont })
      },
    }),
    {
      name: 'font-preference',
      onRehydrateStorage: () => (state) => {
        if (state?.fontFamily) {
          syncFontToDom(state.fontFamily)
        }
      },
    }
  )
)
