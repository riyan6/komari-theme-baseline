export type FontFamilyKey = 'inter-tight' | 'geist' | 'space-grotesk'

export interface FontOption {
  key: FontFamilyKey
  name: string
  cssVar: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    key: 'inter-tight',
    name: 'Inter Tight',
    cssVar: 'var(--font-option-inter-tight)',
  },
  {
    key: 'geist',
    name: 'Geist',
    cssVar: 'var(--font-option-geist)',
  },
  {
    key: 'space-grotesk',
    name: 'Space Grotesk',
    cssVar: 'var(--font-option-space-grotesk)',
  },
]

/** 默认展示字体（与 komari-theme.json 中 displayFont 的默认值保持一致） */
export const DEFAULT_DISPLAY_FONT: FontFamilyKey = 'space-grotesk'

/** 默认正文字体（与 komari-theme.json 中 bodyFont 的默认值保持一致） */
export const DEFAULT_BODY_FONT: FontFamilyKey = 'inter-tight'

// inter-tight / space-grotesk 在 main.tsx 中静态引入，只有 geist 按需加载。
const loadedFonts = new Set<string>(['inter-tight', 'space-grotesk'])

export const loadFontOnDemand = async (key: FontFamilyKey) => {
  if (loadedFonts.has(key)) return
  if (key === 'geist') {
    await import('@fontsource-variable/geist')
    loadedFonts.add('geist')
  }
}

/** 把配置里的字体名（或 key）解析成内部字体 key，未知值回退到指定默认字体。 */
export const resolveFontFamilyKey = (
  value: unknown,
  fallback: FontFamilyKey = DEFAULT_DISPLAY_FONT,
): FontFamilyKey => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback
  const match = FONT_OPTIONS.find(
    (option) =>
      option.key === normalized || option.name.toLowerCase() === normalized,
  )
  return match?.key ?? fallback
}

/** 应用展示字体与正文字体：写入 data-font-display / data-font-body 并按需加载字体文件。 */
export const applyThemeFonts = (
  displayFont: FontFamilyKey,
  bodyFont: FontFamilyKey,
) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-font-display', displayFont)
    document.documentElement.setAttribute('data-font-body', bodyFont)
    document.documentElement.setAttribute('data-font', bodyFont)
  }
  void loadFontOnDemand(displayFont)
  void loadFontOnDemand(bodyFont)
}
