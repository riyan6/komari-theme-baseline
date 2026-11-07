import React, { useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTranslation } from 'react-i18next'
import {
  useFontStore,
  FONT_OPTIONS,
  loadFontOnDemand,
} from '@/lib/font-store'

export const FontSwitcher: React.FC = () => {
  const { t } = useTranslation()
  const { fontFamily, setFontFamily, cycleFont } = useFontStore()

  const currentOption =
    FONT_OPTIONS.find((f) => f.key === fontFamily) || FONT_OPTIONS[0]

  // Global shortcut: press 'f' to cycle through fonts, except when typing in inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        cycleFont()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cycleFont])

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Pre-load all available fonts so preview in dropdown can render immediately
      void loadFontOnDemand('geist')
      void loadFontOnDemand('space-grotesk')
    }
  }

  return (
    <DropdownMenu.Root onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t('common.font', 'Font')}
          className="inline-flex h-[38px] items-center justify-center border border-black bg-white px-3 type-label text-black transition-colors hover:bg-[#F7F7F7] focus:outline-none dark:border-[#262626] dark:bg-[#0A0A0A] dark:text-[#F2F2F2] dark:hover:bg-[#141414] cursor-pointer"
        >
          {/* Desktop: Full font name uppercase; Mobile: abbreviation */}
          <span className="hidden sm:inline">{currentOption.name.toUpperCase()}</span>
          <span className="sm:hidden">{currentOption.shortName}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[160px] border border-black bg-white p-1 text-black dark:border-[#262626] dark:bg-[#0A0A0A] dark:text-[#F2F2F2]"
          style={{ borderRadius: 0, boxShadow: 'none' }}
        >
          <div className="type-caption font-semibold uppercase tracking-wider text-[#6B6B6B] dark:text-[#8C8C8C] px-3 py-1.5 border-b border-[#E5E5E5] dark:border-[#262626] mb-1">
            {t('common.font', 'FONT')}
          </div>
          {FONT_OPTIONS.map((opt) => {
            const isSelected = fontFamily === opt.key
            return (
              <DropdownMenu.Item
                key={opt.key}
                onSelect={() => setFontFamily(opt.key)}
                className="flex h-[36px] cursor-pointer items-center gap-2.5 px-3 type-meta outline-none transition-colors hover:bg-[#F7F7F7] dark:hover:bg-[#141414]"
                style={{
                  fontFamily: `${opt.fontFamily}, "Noto Sans SC", sans-serif`,
                }}
              >
                {isSelected ? (
                  <span className="h-[6px] w-[6px] bg-black dark:bg-[#F2F2F2] shrink-0" />
                ) : (
                  <span className="h-[6px] w-[6px] shrink-0" />
                )}
                <span>{opt.name}</span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
