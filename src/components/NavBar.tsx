import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, ArrowUpRight, Table2, LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePublicInfo } from '@/contexts/PublicInfoContext'
import { useNoiseProbe } from '@/hooks/useNoiseProbe'
import { useNoisePreferences } from '@/lib/noise-store'
import { FontSwitcher } from '@/components/FontSwitcher'
import { writeLanguageCookie } from '@/utils/language'

const NavBar: React.FC = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { publicInfo } = usePublicInfo()
  const { stale, updatedAt } = useNoiseProbe()
  const { theme, setTheme, setLang, statusViewMode, setStatusViewMode } =
    useNoisePreferences()
  const isHome = location.pathname === '/'
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
        {/* Left: Status / Site Name */}
        <Link
          to="/"
          className="flex items-center gap-2.5 tracking-tight text-black transition dark:text-[#F2F2F2]"
        >
          <span className={stale ? 'status-square-offline' : 'status-square-online'} />
          <span className="type-title">{siteName}</span>
        </Link>

        {/* Right Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* LIVE · 2s + 6px square */}
          <div className="type-label flex items-center gap-2 text-[#6B6B6B] dark:text-[#8C8C8C]">
            <span
              className={`${
                stale
                  ? 'status-square-offline'
                  : `status-square-online ${ticking ? 'live-tick' : ''}`
              }`}
            />
            <span className="hidden sm:inline">{t('status.live')} · 2s</span>
          </div>

          {/* Language Switch: plain text EN / 中 with underline */}
          <div className="type-meta flex items-center gap-1.5 text-[#6B6B6B] dark:text-[#8C8C8C]">
            <button
              type="button"
              onClick={() => handleToggleLang('en')}
              className={`cursor-pointer transition-colors hover:text-black dark:hover:text-white ${
                !isZh
                  ? 'text-black dark:text-white underline underline-offset-4 font-semibold'
                  : 'text-[#6B6B6B] dark:text-[#8C8C8C]'
              }`}
            >
              EN
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => handleToggleLang('zh')}
              className={`cursor-pointer transition-colors hover:text-black dark:hover:text-white ${
                isZh
                  ? 'text-black dark:text-white underline underline-offset-4 font-semibold'
                  : 'text-[#6B6B6B] dark:text-[#8C8C8C]'
              }`}
            >
              中
            </button>
          </div>

          {/* View Switcher (Table / Card) on Homepage */}
          {isHome && (
            <div className="inline-flex h-[38px] items-stretch border border-black bg-white dark:border-[#262626] dark:bg-[#0A0A0A]">
              <button
                type="button"
                onClick={() => setStatusViewMode('table')}
                aria-label={t('status.view_table')}
                title={t('status.view_table')}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 type-label cursor-pointer border-0 transition-colors ${
                  statusViewMode === 'table'
                    ? 'bg-black text-white dark:bg-[#F2F2F2] dark:text-black'
                    : 'bg-white text-[#6B6B6B] hover:text-black hover:bg-[#F7F7F7] dark:bg-[#0A0A0A] dark:text-[#8C8C8C] dark:hover:text-[#F2F2F2] dark:hover:bg-[#141414]'
                }`}
              >
                <Table2 size={14} />
                <span className="hidden sm:inline">{t('status.view_table')}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusViewMode('card')}
                aria-label={t('status.view_card')}
                title={t('status.view_card')}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 type-label cursor-pointer border-0 border-l border-black dark:border-[#262626] transition-colors ${
                  statusViewMode === 'card'
                    ? 'bg-black text-white dark:bg-[#F2F2F2] dark:text-black'
                    : 'bg-white text-[#6B6B6B] hover:text-black hover:bg-[#F7F7F7] dark:bg-[#0A0A0A] dark:text-[#8C8C8C] dark:hover:text-[#F2F2F2] dark:hover:bg-[#141414]'
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">{t('status.view_card')}</span>
              </button>
            </div>
          )}

          {/* Font Switcher */}
          <FontSwitcher />

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
