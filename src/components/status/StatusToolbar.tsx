import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

export type StatusSortDir = 'desc' | 'asc'

export type StatusSortKey =
  | 'default'
  | 'name'
  | 'region'
  | 'load'
  | 'cpu'
  | 'mem'
  | 'disk'
  | 'traffic'
  | 'billing'
  | 'speed'
  | 'uptime'

interface StatusToolbarProps {
  query: string
  setQuery: (q: string) => void
  groups: string[]
  selectedGroup: string
  setSelectedGroup: (g: string) => void
  groupCounts: Record<string, number>
  totalCount: number
}

export const StatusToolbar: React.FC<StatusToolbarProps> = ({
  query,
  setQuery,
  groups,
  selectedGroup,
  setSelectedGroup,
  groupCounts,
  totalCount,
}) => {
  const { t } = useTranslation()
  const [isSearchOpen, setIsSearchOpen] = useState(() => Boolean(query))
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!query && document.activeElement !== searchInputRef.current) {
      setIsSearchOpen(false)
    }
  }, [query])

  const handleOpenSearch = () => {
    setIsSearchOpen(true)
    requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
  }

  const showSearchBox = isSearchOpen || Boolean(query)

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-black pb-4 dark:border-[#333333]">
      {/* Left: Group Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {groups.length > 0 && (
          <span className="label-swiss mr-1">{t('status.group')}:</span>
        )}
        <button
          type="button"
          onClick={() => setSelectedGroup('all')}
          className={`inline-flex h-[34px] items-center px-3.5 type-label transition-colors cursor-pointer border ${
            selectedGroup === 'all'
              ? 'border-black bg-black text-white dark:border-[#F2F2F2] dark:bg-[#F2F2F2] dark:text-black'
              : 'border-transparent text-[#6B6B6B] hover:text-black hover:border-black/30 dark:text-[#8C8C8C] dark:hover:text-white dark:hover:border-white/30'
          }`}
        >
          {t('status.group_all')} ({totalCount})
        </button>
        {groups.map((group) => {
          const count = groupCounts[group] || 0
          const isSelected = selectedGroup === group
          return (
            <button
              key={group}
              type="button"
              onClick={() => setSelectedGroup(group)}
              className={`inline-flex h-[34px] items-center px-3.5 type-label transition-colors cursor-pointer border ${
                isSelected
                  ? 'border-black bg-black text-white dark:border-[#F2F2F2] dark:bg-[#F2F2F2] dark:text-black'
                  : 'border-transparent text-[#6B6B6B] hover:text-black hover:border-black/30 dark:text-[#8C8C8C] dark:hover:text-white dark:hover:border-white/30'
              }`}
            >
              {group} ({count})
            </button>
          )
        })}
      </div>

      {/* Right: Collapsible Search Icon / Input */}
      <div className="ml-auto flex items-center">
        {showSearchBox ? (
          <div className="inline-flex h-[34px] w-56 sm:w-64 items-center border border-black bg-white px-2.5 dark:border-[#F2F2F2] dark:bg-[#0A0A0A]">
            <Search size={15} className="shrink-0 text-[#6B6B6B] dark:text-[#8C8C8C]" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => {
                if (!query.trim()) {
                  setIsSearchOpen(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuery('')
                  setIsSearchOpen(false)
                }
              }}
              placeholder={t('status.search_placeholder')}
              className="w-full bg-transparent px-2 type-control text-black placeholder:text-[#8C8C8C] focus:outline-none dark:text-[#F2F2F2]"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery('')
                setIsSearchOpen(false)
              }}
              aria-label={t('status.clear_search')}
              title={t('status.clear_search')}
              className="inline-flex items-center justify-center p-0.5 text-[#6B6B6B] hover:text-black dark:text-[#8C8C8C] dark:hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpenSearch}
            aria-label={t('status.search_nodes')}
            title={t('status.search_nodes')}
            className="inline-flex h-[34px] w-[34px] items-center justify-center border border-transparent text-[#6B6B6B] transition-colors hover:border-black hover:text-black dark:text-[#8C8C8C] dark:hover:border-[#F2F2F2] dark:hover:text-[#F2F2F2] cursor-pointer"
          >
            <Search size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
