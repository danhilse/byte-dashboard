"use client"

import { useState, useMemo, type ReactNode } from "react"

// ---------- types ----------

type RawItem = {
  title: string
  effort: string
  mvp_priority: string
  impact: string | string[]
  strategic_alignment: string
}

type Category = {
  id: number
  name: string
  items?: RawItem[]
  subcategories?: { name: string; items: RawItem[] }[]
}

type BacklogData = {
  meta: { updated: string; scales: Record<string, string> }
  categories: Category[]
}

type FlatItem = {
  title: string
  effort: string
  mvp_priority: string
  impact: string[]
  strategic_alignment: string
  category: string
  subcategory: string | null
}

type SortKey = "title" | "effort" | "mvp_priority" | "impact" | "strategic_alignment" | "category"
type SortDir = "asc" | "desc"

// ---------- helpers ----------

function flatten(data: BacklogData): FlatItem[] {
  const items: FlatItem[] = []
  const normalize = (item: RawItem, category: string, subcategory: string | null): FlatItem => ({
    ...item,
    impact: Array.isArray(item.impact) ? item.impact : [item.impact],
    category,
    subcategory,
  })
  for (const cat of data.categories) {
    if (cat.items) {
      for (const item of cat.items) items.push(normalize(item, cat.name, null))
    }
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        for (const item of sub.items) items.push(normalize(item, cat.name, sub.name))
      }
    }
  }
  return items
}

function numericRank(val: string): number {
  const match = val.match(/\d+/)
  return match ? parseInt(match[0], 10) : 99
}

function getValue(item: FlatItem, key: SortKey): string {
  if (key === "impact") return item.impact.join(", ")
  return item[key] ?? ""
}

function compare(a: FlatItem, b: FlatItem, key: SortKey, dir: SortDir): number {
  const av = getValue(a, key)
  const bv = getValue(b, key)
  const ranked = ["effort", "mvp_priority", "strategic_alignment"]
  const cmp = ranked.includes(key) ? numericRank(av) - numericRank(bv) : av.localeCompare(bv)
  return dir === "asc" ? cmp : -cmp
}

function uniqueCategories(items: FlatItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.category))).sort()
}

// ---------- badge colors ----------

const priorityColors: Record<string, string> = {
  P0: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  P1: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  P2: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  P3: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
}

const effortColors: Record<string, string> = {
  E0: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  E1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  E2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300",
  E3: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  E4: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
}

const strategicColors: Record<string, string> = {
  S0: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
  S1: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  S2: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  S3: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  S4: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300",
}

const impactColors: Record<string, string> = {
  UX: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Admin: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Revenue: "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
  Strategic: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  DX: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
}

function Badge({ value, palette }: { value: string; palette?: Record<string, string> }) {
  const cls = palette?.[value] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {value}
    </span>
  )
}

// ---------- filter row ----------

function FilterRow({
  label,
  options,
  selected,
  onToggle,
  palette,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onToggle: (val: string) => void
  palette?: Record<string, string>
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-start gap-x-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60 last:border-b-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pt-0.5">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.has(opt)
          const base = palette?.[opt] ?? ""
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                active
                  ? `${base || "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"} shadow-sm`
                  : "bg-transparent text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 dark:hover:text-zinc-500"
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- sort header ----------

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  currentDir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = currentSort === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 ${
        active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
      } ${className ?? ""}`}
    >
      {label}
      {active && <span className="ml-1">{currentDir === "asc" ? "↑" : "↓"}</span>}
    </th>
  )
}

// ---------- chevron ----------

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

// ---------- main component ----------

export function RoadmapView({ data }: { data: BacklogData }) {
  const allItems = useMemo(() => flatten(data), [data])
  const categories = useMemo(() => uniqueCategories(allItems), [allItems])
  const priorities = ["P0", "P1", "P2", "P3"]
  const efforts = ["E0", "E1", "E2", "E3", "E4"]
  const impacts = ["UX", "Admin", "Revenue", "Strategic", "DX"]
  const strategics = ["S0", "S1", "S2", "S3", "S4"]

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selCats, setSelCats] = useState<Set<string>>(() => new Set(categories))
  const [selPri, setSelPri] = useState<Set<string>>(() => new Set(priorities))
  const [selEff, setSelEff] = useState<Set<string>>(() => new Set(efforts))
  const [selImp, setSelImp] = useState<Set<string>>(() => new Set(impacts))
  const [selStr, setSelStr] = useState<Set<string>>(() => new Set(strategics))

  const [sortKey, setSortKey] = useState<SortKey>("mvp_priority")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [groupBy, setGroupBy] = useState<"none" | "category" | "mvp_priority">("category")

  function toggle(set: Set<string>, val: string, setter: (s: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setter(next)
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const isFiltered = useMemo(() => {
    return (
      selCats.size !== categories.length ||
      selPri.size !== priorities.length ||
      selEff.size !== efforts.length ||
      selImp.size !== impacts.length ||
      selStr.size !== strategics.length
    )
  }, [selCats, selPri, selEff, selImp, selStr, categories.length])

  const filtered = useMemo(() => {
    return allItems.filter(
      (i) =>
        selCats.has(i.category) &&
        selPri.has(i.mvp_priority) &&
        selEff.has(i.effort) &&
        i.impact.some((imp) => selImp.has(imp)) &&
        selStr.has(i.strategic_alignment)
    )
  }, [allItems, selCats, selPri, selEff, selImp, selStr])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => compare(a, b, sortKey, sortDir))
  }, [filtered, sortKey, sortDir])

  const grouped = useMemo(() => {
    if (groupBy === "none") return null
    const map = new Map<string, FlatItem[]>()
    for (const item of sorted) {
      const key = groupBy === "category" ? item.category : item.mvp_priority
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [sorted, groupBy])

  const priCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of priorities) counts[p] = 0
    for (const i of filtered) counts[i.mvp_priority] = (counts[i.mvp_priority] || 0) + 1
    return counts
  }, [filtered])

  function resetFilters() {
    setSelCats(new Set(categories))
    setSelPri(new Set(priorities))
    setSelEff(new Set(efforts))
    setSelImp(new Set(impacts))
    setSelStr(new Set(strategics))
  }

  function renderTable(items: FlatItem[], groupLabel?: string) {
    const isGrouped = !!groupLabel
    const hideCategoryCol = groupBy === "category" && isGrouped
    const hidePriorityCol = groupBy === "mvp_priority" && isGrouped
    const showSubcategories = groupBy === "category" && isGrouped
    const firstColWidth = hideCategoryCol || hidePriorityCol ? "w-[54%]" : "w-[38%]"

    // When showing subcategories, group items by subcategory while preserving sort order
    const displayItems = showSubcategories
      ? [...items].sort((a, b) => {
          if (!a.subcategory && b.subcategory) return -1
          if (a.subcategory && !b.subcategory) return 1
          if (a.subcategory !== b.subcategory) return (a.subcategory ?? "").localeCompare(b.subcategory ?? "")
          return 0
        })
      : items

    const colCount = 6 - (hideCategoryCol ? 1 : 0) - (hidePriorityCol ? 1 : 0)

    // Build rows with optional subcategory headers
    const rows: ReactNode[] = []
    let currentSub: string | null | undefined = undefined

    for (let idx = 0; idx < displayItems.length; idx++) {
      const item = displayItems[idx]

      if (showSubcategories && item.subcategory && item.subcategory !== currentSub) {
        rows.push(
          <tr key={`sub-${item.subcategory}`} className="bg-zinc-50/80 dark:bg-zinc-900/40">
            <td colSpan={colCount} className="px-4 py-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide">
              {item.subcategory}
            </td>
          </tr>
        )
      }
      currentSub = item.subcategory

      rows.push(
        <tr key={idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors">
          <td className="px-3 py-2.5">
            <span className="text-zinc-900 dark:text-zinc-100">{item.title}</span>
          </td>
          {!hideCategoryCol && (
            <td className="px-3 py-2.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.category}</span>
            </td>
          )}
          <td className="px-3 py-2.5"><Badge value={item.effort} palette={effortColors} /></td>
          {!hidePriorityCol && (
            <td className="px-3 py-2.5"><Badge value={item.mvp_priority} palette={priorityColors} /></td>
          )}
          <td className="px-3 py-2.5">
            <div className="flex flex-wrap gap-1">
              {item.impact.map((imp) => (
                <Badge key={imp} value={imp} palette={impactColors} />
              ))}
            </div>
          </td>
          <td className="px-3 py-2.5"><Badge value={item.strategic_alignment} palette={strategicColors} /></td>
        </tr>
      )
    }

    return (
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/60 sticky top-0 z-10">
          <tr>
            <SortHeader
              label={isGrouped ? `${groupLabel} (${items.length})` : "Item"}
              sortKey="title"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className={firstColWidth}
            />
            {!hideCategoryCol && (
              <SortHeader label="Category" sortKey="category" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[16%]" />
            )}
            <SortHeader label="Effort" sortKey="effort" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[8%]" />
            {!hidePriorityCol && (
              <SortHeader label="MVP" sortKey="mvp_priority" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[8%]" />
            )}
            <SortHeader label="Impact" sortKey="impact" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[18%]" />
            <SortHeader label="Strategic" sortKey="strategic_alignment" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[10%]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {rows}
        </tbody>
      </table>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">MVP Roadmap Backlog</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {filtered.length} of {allItems.length} items &middot; Updated {data.meta.updated}
          </p>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {priorities.map((p) => (
            <div
              key={p}
              className={`rounded-lg px-4 py-3 ${priorityColors[p]}`}
            >
              <div className="text-2xl font-bold">{priCounts[p] || 0}</div>
              <div className="text-[11px] font-medium opacity-70 mt-0.5">
                {p === "P0" ? "Must Have" : p === "P1" ? "Should Have" : p === "P2" ? "Nice to Have" : "Post-MVP"}
              </div>
            </div>
          ))}
        </div>

        {/* filters - collapsible */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg mb-6 overflow-hidden">
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Filters
              </span>
              {isFiltered && (
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isFiltered && (
                <span
                  onClick={(e) => { e.stopPropagation(); resetFilters() }}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  Reset
                </span>
              )}
              <ChevronIcon open={filtersOpen} />
            </div>
          </button>

          {filtersOpen && (
            <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <FilterRow label="Priority" options={priorities} selected={selPri} onToggle={(v) => toggle(selPri, v, setSelPri)} palette={priorityColors} />
              <FilterRow label="Effort" options={efforts} selected={selEff} onToggle={(v) => toggle(selEff, v, setSelEff)} palette={effortColors} />
              <FilterRow label="Impact" options={impacts} selected={selImp} onToggle={(v) => toggle(selImp, v, setSelImp)} palette={impactColors} />
              <FilterRow label="Strategic" options={strategics} selected={selStr} onToggle={(v) => toggle(selStr, v, setSelStr)} palette={strategicColors} />
              <FilterRow label="Category" options={categories} selected={selCats} onToggle={(v) => toggle(selCats, v, setSelCats)} />
            </div>
          )}
        </div>

        {/* toolbar: group by */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Group by
          </span>
          {(["none", "category", "mvp_priority"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                groupBy === g
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {g === "none" ? "None" : g === "category" ? "Category" : "Priority"}
            </button>
          ))}
        </div>

        {/* table */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          {grouped ? (
            Array.from(grouped.entries()).map(([group, items], idx) => (
              <div key={group} className={idx > 0 ? "border-t border-zinc-300 dark:border-zinc-700" : ""}>
                {renderTable(items, group)}
              </div>
            ))
          ) : (
            renderTable(sorted)
          )}
          {filtered.length === 0 && (
            <div className="px-4 py-16 text-center text-zinc-400 dark:text-zinc-500">
              No items match current filters
            </div>
          )}
        </div>

        {/* legend */}
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] text-zinc-400 dark:text-zinc-500">
          <div>
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">Effort:</span>{" "}
            E0 trivial &rarr; E4 major project
          </div>
          <div>
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">MVP Priority:</span>{" "}
            P0 must have &rarr; P3 post-MVP
          </div>
          <div>
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">Impact:</span>{" "}
            UX | Admin | Revenue | Strategic | DX
          </div>
          <div>
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">Strategic:</span>{" "}
            S0 no alignment &rarr; S4 core to vision
          </div>
        </div>
      </div>
    </div>
  )
}
