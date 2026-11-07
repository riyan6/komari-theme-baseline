import { useRef } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  useNoiseFilters,
  useNoisePreferences,
  type StatusFilter,
} from '@/lib/noise-store'
import { useNoiseT } from '@/lib/noise-i18n'

const pad = (value: number) => String(value).padStart(2, '0')

interface FilterBarProps {
  totalCount: number
  onlineCount: number
  offlineCount: number
  regions: string[]
}

export function FilterBar({
  totalCount,
  onlineCount,
  offlineCount,
  regions,
}: FilterBarProps) {
  const t = useNoiseT()
  const { view, cardDensity, setCardDensity } = useNoisePreferences()
  const { query, status, region, setQuery, setStatus, setRegion } = useNoiseFilters()
  const searchRef = useRef<HTMLInputElement>(null)

  const statusFilters: [StatusFilter, string, number][] = [
    ['all', t.all, totalCount],
    ['online', t.online, onlineCount],
    ['offline', t.offline, offlineCount],
  ]

  return (
    <div className="filter-bar">
      {/* Status tabs */}
      <div className="status-filters">
        {statusFilters.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            data-slot="button"
            className={status === key ? 'active' : ''}
            onClick={() => setStatus(key)}
            aria-pressed={status === key}
          >
            {label}
            <span className={key === 'offline' && count > 0 ? 'critical' : 'muted'}>
              {pad(count)}
            </span>
          </button>
        ))}
      </div>

      {/* Filter controls */}
      <div className="filter-controls">
        {view === 'grid' && (
          <div
            className="toggle-group density-toggle"
            role="group"
            aria-label={t.cardDensity}
          >
            {(
              [
                ['compact', t.compact],
                ['detailed', t.detailed],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-slot="button"
                aria-pressed={cardDensity === key}
                className={cardDensity === key ? 'active' : ''}
                onClick={() => setCardDensity(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Region selector */}
        <div className="select-field">
          <select
            aria-label={t.region}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="all">{t.allRegions}</option>
            {regions.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>

        {/* Search Input */}
        <div className="search-field">
          <Search size={13} />
          <Input
            ref={searchRef}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.searchLabel}
          />
          {query ? (
            <button
              type="button"
              data-slot="button"
              aria-label={t.clearSearch}
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <X size={13} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </div>
      </div>
    </div>
  )
}
