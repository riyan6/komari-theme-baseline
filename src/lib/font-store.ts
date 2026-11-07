export type FontFamilyKey = 'inter-tight' | 'geist' | 'space-grotesk'

export interface FontOption {
  key: FontFamilyKey
  name: string
  fontFamily: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    key: 'inter-tight',
    name: 'Inter Tight',
    fontFamily: '"Inter Tight Variable"',
  },
  {
    key: 'geist',
    name: 'Geist',
    fontFamily: '"Geist Variable"',
  },
  {
    key: 'space-grotesk',
    name: 'Space Grotesk',
    fontFamily: '"Space Grotesk Variable"',
  },
]

/** 默认字体（与 komari-theme.json 中 fontFamily 的默认值保持一致） */
export const DEFAULT_FONT_FAMILY: FontFamilyKey = 'space-grotesk'

// inter-tight / space-grotesk 在 main.tsx 中静态引入，只有 geist 按需加载。
const loadedFonts = new Set<string>(['inter-tight', 'space-grotesk'])

export const loadFontOnDemand = async (key: FontFamilyKey) => {
  if (loadedFonts.has(key)) return
  if (key === 'geist') {
    await import('@fontsource-variable/geist')
    loadedFonts.add('geist')
  }
}

/** 把配置里的字体名（或 key）解析成内部字体 key，未知值回退到默认字体。 */
export const resolveFontFamilyKey = (value: unknown): FontFamilyKey => {
  if (typeof value !== 'string') return DEFAULT_FONT_FAMILY
  const normalized = value.trim().toLowerCase()
  if (!normalized) return DEFAULT_FONT_FAMILY
  const match = FONT_OPTIONS.find(
    (option) =>
      option.key === normalized || option.name.toLowerCase() === normalized,
  )
  return match?.key ?? DEFAULT_FONT_FAMILY
}

/** 应用字体：写入 data-font（noise.css 据此切换 --font-current-sans）并按需加载字体文件。 */
export const applyFontFamily = (key: FontFamilyKey) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-font', key)
  }
  void loadFontOnDemand(key)
}
