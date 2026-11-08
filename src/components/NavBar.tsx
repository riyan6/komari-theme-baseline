import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePublicInfo } from '@/contexts/PublicInfoContext'
import { useNoiseProbe } from '@/hooks/useNoiseProbe'
import { useNoisePreferences } from '@/lib/noise-store'
import { writeLanguageCookie } from '@/utils/language'

const NavBar: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { publicInfo } = usePublicInfo()
  const { stale, updatedAt } = useNoiseProbe()
  const { theme, setTheme, setLang } = useNoisePreferences()
  const [ticking, setTicking] = useState(false)
  const prevTickRef = useRef(updatedAt)

  useEffect(() => {
    if (prevTickRef.current !== updatedAt) {
      setTicking(true)
      const timer = setTimeout(() => setTicking(false), 400)
      prevTickRef.current = updatedAt
      return () => clearTimeout(timer)
    }
  }, [updatedAt])

  const currentLang = i18n.language?.toLowerCase() || ''
  const isZh = currentLang.startsWith('zh')

  const handleToggleLang = (target: 'en' | 'zh') => {
    const code = target === 'zh' ? 'zh-CN' : 'en-US'
    void i18n.changeLanguage(code)
    writeLanguageCookie(code)
    setLang(target)
  }

  const siteName = publicInfo?.sitename || 'Status'

  return (
    <header className="sticky top-0 z-30 w-full border-b border-black bg-white dark:border-[#262626] dark:bg-[#0A0A0A]">
      <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between px-6 sm:px-8 xl:px-12">
        {/* Left: Site Name */}
        <Link
          to="/"
          className="flex items-center tracking-tight text-black transition dark:text-[#F2F2F2]"
        >
          <span className="type-title">{siteName}</span>
        </Link>

        {/* Right Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* LIVE · 2s + 6px square (uppercase only on label text, not value/unit) */}
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.05em] text-[#6B6B6B] dark:text-[#8C8C8C]">
            <span
              className={`${
                stale
                  ? 'status-square-offline'
                  : `status-square-online ${ticking ? 'live-tick' : ''}`
              }`}
            />
            <span className="hidden sm:inline">
              <span className="uppercase">{t('status.live')}</span> · 2s
            </span>
          </div>

          {/* Language Switch: weight 600 + 2px black underline */}
          <div className="type-meta flex items-center gap-2 text-[#6B6B6B] dark:text-[#8C8C8C]">
            <button
              type="button"
              onClick={() => handleToggleLang('en')}
              className={`relative cursor-pointer pb-1 leading-none transition-colors hover:text-black dark:hover:text-[#F2F2F2] ${
                !isZh
                  ? 'font-semibold text-black dark:text-[#F2F2F2]'
                  : 'font-medium text-[#6B6B6B] dark:text-[#8C8C8C]'
              }`}
            >
              EN
              {!isZh && (
                <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-black dark:bg-[#F2F2F2]" />
              )}
            </button>
            <span className="pb-1 leading-none">/</span>
            <button
              type="button"
              onClick={() => handleToggleLang('zh')}
              className={`relative cursor-pointer pb-1 leading-none transition-colors hover:text-black dark:hover:text-[#F2F2F2] ${
                isZh
                  ? 'font-semibold text-black dark:text-[#F2F2F2]'
                  : 'font-medium text-[#6B6B6B] dark:text-[#8C8C8C]'
              }`}
            >
              中
              {isZh && (
                <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-black dark:bg-[#F2F2F2]" />
              )}
            </button>
          </div>

          {/* Theme Toggle: icon only, no border/circle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center justify-center text-[#6B6B6B] hover:text-black dark:text-[#8C8C8C] dark:hover:text-white cursor-pointer bg-transparent border-0 p-1"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Admin panel button: solid black rectangle, hover inverted */}
          <a href="/admin" className="btn-swiss-primary">
            <span>{t('status.admin_panel')}</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </header>
  )
}

export default NavBar
