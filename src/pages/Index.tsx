import React, { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'

import { StatusHero } from '@/components/status/StatusHero'
import {
  StatusToolbar,
  type StatusSortDir,
  type StatusSortKey,
} from '@/components/status/StatusToolbar'
import { ServerTableView } from '@/components/status/ServerTableView'
import { ServerCardView } from '@/components/status/ServerCardView'
import { useNoiseProbe } from '@/hooks/useNoiseProbe'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useNoisePreferences } from '@/lib/noise-store'

const pointerOptions = { activationConstraint: { distance: 5 } }
const keyboardOptions = { coordinateGetter: sortableKeyboardCoordinates }

const Index: React.FC = () => {
  const { t } = useTranslation()
  const { nodes, isLoading } = useNoiseProbe()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<StatusSortKey>('default')
  const [sortDir, setSortDir] = useState<StatusSortDir>('desc')
  const viewMode = useNoisePreferences((state) => state.statusViewMode)
  const [customOrder, setCustomOrder] = useLocalStorage<string[]>(
    'statusNodeOrder',
    []
  )
  const [selectedGroup, setSelectedGroup] = useLocalStorage<string>(
    'statusSelectedGroup',
    'all'
  )
  const reducedMotion = useReducedMotion()

  const sensors = useSensors(
    useSensor(PointerSensor, pointerOptions),
    useSensor(KeyboardSensor, keyboardOptions)
  )

  // Calculate accurate fleet stats directly from bytes
  const { onlineCount, speedUp, speedDown, trafficUp, trafficDown } =
    useMemo(() => {
      let online = 0
      let up = 0
      let down = 0
      let tUp = 0
      let tDown = 0

      for (const node of nodes) {
        if (node.online) {
          online++
          up += node.upBytes
          down += node.downBytes
        }
        tUp += node.totalUp
        tDown += node.totalDown
      }

      return {
        onlineCount: online,
        speedUp: up,
        speedDown: down,
        trafficUp: tUp,
        trafficDown: tDown,
      }
    }, [nodes])

  // Extract distinct groups and group count mapping
  const { groups, groupCounts } = useMemo(() => {
    const counts: Record<string, number> = {}
    const groupSet = new Set<string>()

    for (const node of nodes) {
      if (node.group && node.group.trim()) {
        const g = node.group.trim()
        groupSet.add(g)
        counts[g] = (counts[g] || 0) + 1
      }
    }

    return {
      groups: Array.from(groupSet).sort(),
      groupCounts: counts,
    }
  }, [nodes])

  // Filter and sort nodes
  const processedNodes = useMemo(() => {
    const q = query.trim().toLowerCase()

    let result = nodes.filter((node) => {
      // 1. Group Filter
      if (selectedGroup !== 'all' && (node.group || '').trim() !== selectedGroup) {
        return false
      }

      // 2. Query Search
      if (!q) return true
      const searchStr =
        `${node.name} ${node.region} ${node.os} ${node.provider} ${node.ip} ${node.group} ${node.tags}`.toLowerCase()
      return searchStr.includes(q)
    })

    // Custom order mapping or multi-key sort
    if (sortKey === 'default') {
      if (customOrder.length > 0) {
        result = [...result].sort((a, b) => {
          const ai = customOrder.indexOf(a.id)
          const bi = customOrder.indexOf(b.id)
          if (ai !== -1 && bi !== -1) return ai - bi
          if (ai !== -1) return -1
          if (bi !== -1) return 1
          if (a.online !== b.online) return a.online ? -1 : 1
          return 0
        })
      } else {
        result = [...result].sort((a, b) => {
          if (a.online !== b.online) return a.online ? -1 : 1
          return 0
        })
      }
    } else {
      const mul = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        if (sortKey === 'name') {
          return mul * a.name.localeCompare(b.name)
        }
        if (sortKey === 'region') {
          const aReg = a.region.trim().toUpperCase()
          const bReg = b.region.trim().toUpperCase()
          if (Boolean(aReg) !== Boolean(bReg)) return aReg ? -1 : 1
          return mul * aReg.localeCompare(bReg)
        }
        if (sortKey === 'traffic') {
          const aHasData = a.online || a.total > 0
          const bHasData = b.online || b.total > 0
          if (aHasData !== bHasData) return aHasData ? -1 : 1
          const aHasQuota = a.trafficLimit > 0
          const bHasQuota = b.trafficLimit > 0
          if (aHasQuota && bHasQuota) {
            return mul * (a.trafficPercent - b.trafficPercent)
          }
          if (aHasQuota !== bHasQuota) return aHasQuota ? -1 : 1
          return mul * (a.total - b.total)
        }
        if (sortKey === 'billing') {
          const aHasBilling = a.daysLeft !== null || a.price !== 0
          const bHasBilling = b.daysLeft !== null || b.price !== 0
          if (aHasBilling !== bHasBilling) return aHasBilling ? -1 : 1
          if (a.daysLeft !== null && b.daysLeft !== null && a.daysLeft !== b.daysLeft) {
            return mul * (a.daysLeft - b.daysLeft)
          }
          if ((a.daysLeft !== null) !== (b.daysLeft !== null)) {
            return a.daysLeft !== null ? -1 : 1
          }
          return mul * (a.price - b.price)
        }

        // Live-dependent metrics: keep offline (—) nodes grouped below online nodes
        if (a.online !== b.online) {
          return a.online ? -1 : 1
        }
        if (sortKey === 'load') {
          return mul * (a.load1 - b.load1)
        }
        if (sortKey === 'cpu') {
          return mul * (a.cpu - b.cpu)
        }
        if (sortKey === 'mem') {
          return mul * (a.mem - b.mem)
        }
        if (sortKey === 'disk') {
          return mul * (a.disk - b.disk)
        }
        if (sortKey === 'speed') {
          return mul * (a.downBytes + a.upBytes - (b.downBytes + b.upBytes))
        }
        if (sortKey === 'uptime') {
          return mul * (a.uptime - b.uptime)
        }
        return 0
      })
    }

    return result
  }, [nodes, query, selectedGroup, sortKey, sortDir, customOrder])

  // Click column header: desc (↓) -> asc (↑) -> default
  const handleToggleSort = (key: StatusSortKey) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('desc')
    } else if (sortDir === 'desc') {
      setSortDir('asc')
    } else {
      setSortKey('default')
      setSortDir('desc')
    }
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const currentIds = processedNodes.map((n) => n.id)
    const oldIndex = currentIds.indexOf(String(active.id))
    const newIndex = currentIds.indexOf(String(over.id))
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(currentIds, oldIndex, newIndex)
      setCustomOrder(reordered)
    }
  }

  const motionTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.12, ease: 'easeOut' as const }

  return (
    <div className="w-full">
      {/* Hero Stats */}
      <StatusHero
        onlineCount={onlineCount}
        totalCount={nodes.length}
        speedUp={speedUp}
        speedDown={speedDown}
        trafficUp={trafficUp}
        trafficDown={trafficDown}
      />

      {/* Group Filter & Collapsible Search */}
      <StatusToolbar
        query={query}
        setQuery={setQuery}
        groups={groups}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        groupCounts={groupCounts}
        totalCount={nodes.length}
      />

      {/* Main Server Display */}
      {processedNodes.length === 0 ? (
        <div className="my-16 flex flex-col items-start justify-center border border-dashed border-[#E5E5E5] p-12 dark:border-[#262626]">
          <div className="type-title uppercase tracking-wider text-black dark:text-[#F2F2F2]">
            {nodes.length
              ? t('status.no_match')
              : isLoading
              ? t('status.waiting_telemetry')
              : t('status.no_nodes')}
          </div>
          {(query || selectedGroup !== 'all') && (
            <div className="mt-4 flex items-center gap-3">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="swiss-btn cursor-pointer"
                >
                  {t('status.clear_search')}
                </button>
              )}
              {selectedGroup !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedGroup('all')}
                  className="swiss-btn cursor-pointer"
                >
                  {t('status.group_all')}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={motionTransition}
          className="w-full"
        >
          {viewMode === 'table' ? (
            <ServerTableView
              nodes={processedNodes}
              sortKey={sortKey}
              sortDir={sortDir}
              onToggleSort={handleToggleSort}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={processedNodes.map((n) => n.id)}
                strategy={rectSortingStrategy}
              >
                <ServerCardView nodes={processedNodes} />
              </SortableContext>
            </DndContext>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default Index
