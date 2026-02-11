"use client"

import { useState, useMemo } from "react"

// ---------- types ----------

type RawItem = {
  title: string
  effort: string
  mvp_priority: string
  impact: string
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

type FlatItem = RawItem & {
  category: string
  subcategory: string | null
}

type SortKey = keyof FlatItem
type SortDir = "asc" | "desc"

// ---------- helpers ----------

function flatten(data: BacklogData): FlatItem[] {
  const items: FlatItem[] = []
  for (const cat of data.categories) {
    if (cat.items) {
      for (const item of cat.items) {
        items.push({ ...item, category: cat.name, subcategory: null })
      }
    }
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        for (const item of sub.items) {
          items.push({ ...item, category: cat.name, subcategory: sub.name })
        }
      }
    }
  }
  return items
}

function numericRank(val: string): number {
  const match = val.match(/\d+/)
  return match ? parseInt(match[0], 10) : 99
}

function compare(a: FlatItem, b: FlatItem, key: SortKey, dir: SortDir): number {
  const av = a[key] ?? ""
  const bv = b[key] ?? ""
  const ranked = ["effort", "mvp_priority", "strategic_alignment"]
  let cmp: number
  if (ranked.includes(key)) {
    cmp = numericRank(av) - numericRank(bv)
  } else {
    cmp = String(av).localeCompare(String(bv))
  }
  return dir === "asc" ? cmp : -cmp
}

function unique(items: FlatItem[], key: keyof FlatItem): string[] {
  return Array.from(new Set(items.map((i) => String(i[key] ?? "—")))).sort()
}

// ---------- badge colors ----------

const priorityColors: Record<string, string> = {
  P0: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 ring-red-300 dark:ring-red-700",
  P1: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 ring-orange-300 dark:ring-orange-700",
  P2: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 ring-sky-300 dark:ring-sky-700",
  P3: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 ring-zinc-300 dark:ring-zinc-600",
}

const effortColors: Record<string, string> = {
  E0: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  E1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  E2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  E3: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  E4: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

const strategicColors: Record<string, string> = {
  S0: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  S1: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  S2: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  S3: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  S4: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
}

const impactColors: Record<string, string> = {
  UX: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Admin: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Revenue: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Strategic: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  DX: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
}

function Badge({ value, palette }: { value: string; palette?: Record<string, string> }) {
  const cls = palette?.[value] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {value}
    </span>
  )
}

// ---------- filter pill ----------

function FilterPills({
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
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-1 min-w-[60px]">{label}</span>
      {options.map((opt) => {
        const active = selected.has(opt)
        const base = palette?.[opt] ?? ""
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-all cursor-pointer border ${
              active
                ? `${base || "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"} border-transparent ring-1 ring-offset-1 ring-zinc-400 dark:ring-zinc-500 dark:ring-offset-zinc-900`
                : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 opacity-50 hover:opacity-75"
            }`}
          >
            {opt}
          </button>
        )
      })}
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
      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 ${
        active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
      } ${className ?? ""}`}
    >
      {label}
      {active && <span className="ml-1">{currentDir === "asc" ? "↑" : "↓"}</span>}
    </th>
  )
}

// ---------- main component ----------

export function RoadmapView({ data }: { data: BacklogData }) {
  const allItems = useMemo(() => flatten(data), [data])
  const categories = useMemo(() => unique(allItems, "category"), [allItems])
  const priorities = ["P0", "P1", "P2", "P3"]
  const efforts = ["E0", "E1", "E2", "E3", "E4"]
  const impacts = useMemo(() => unique(allItems, "impact"), [allItems])
  const strategics = ["S0", "S1", "S2", "S3", "S4"]

  // filters
  const [selCats, setSelCats] = useState<Set<string>>(() => new Set(categories))
  const [selPri, setSelPri] = useState<Set<string>>(() => new Set(priorities))
  const [selEff, setSelEff] = useState<Set<string>>(() => new Set(efforts))
  const [selImp, setSelImp] = useState<Set<string>>(() => new Set(impacts))
  const [selStr, setSelStr] = useState<Set<string>>(() => new Set(strategics))

  // sort
  const [sortKey, setSortKey] = useState<SortKey>("mvp_priority")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // grouping
  const [groupBy, setGroupBy] = useState<"none" | "category" | "mvp_priority">("none")

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

  const filtered = useMemo(() => {
    return allItems.filter(
      (i) =>
        selCats.has(i.category) &&
        selPri.has(i.mvp_priority) &&
        selEff.has(i.effort) &&
        selImp.has(i.impact) &&
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

  // summary counts
  const priCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of priorities) counts[p] = 0
    for (const i of filtered) counts[i.mvp_priority] = (counts[i.mvp_priority] || 0) + 1
    return counts
  }, [filtered])

  function renderTable(items: FlatItem[]) {
    return (
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/60 sticky top-0">
          <tr>
            <SortHeader label="Item" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[40%]" />
            <SortHeader label="Category" sortKey="category" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Effort" sortKey="effort" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="MVP" sortKey="mvp_priority" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Impact" sortKey="impact" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Strategic" sortKey="strategic_alignment" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
              <td className="px-3 py-2.5">
                <span className="text-zinc-900 dark:text-zinc-100">{item.title}</span>
                {item.subcategory && (
                  <span className="ml-2 text-[10px] text-zinc-400 dark:text-zinc-500">{item.subcategory}</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.category}</span>
              </td>
              <td className="px-3 py-2.5"><Badge value={item.effort} palette={effortColors} /></td>
              <td className="px-3 py-2.5"><Badge value={item.mvp_priority} palette={priorityColors} /></td>
              <td className="px-3 py-2.5"><Badge value={item.impact} palette={impactColors} /></td>
              <td className="px-3 py-2.5"><Badge value={item.strategic_alignment} palette={strategicColors} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">MVP Roadmap Backlog</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {filtered.length} of {allItems.length} items &middot; Updated {data.meta.updated}
          </p>
        </div>

        {/* summary bar */}
        <div className="flex gap-3 mb-6">
          {priorities.map((p) => (
            <div
              key={p}
              className={`flex-1 rounded-lg border px-4 py-3 ${
                priorityColors[p]
              } border-current/10`}
            >
              <div className="text-2xl font-bold">{priCounts[p] || 0}</div>
              <div className="text-xs font-medium opacity-70 mt-0.5">
                {p === "P0" ? "Must Have" : p === "P1" ? "Should Have" : p === "P2" ? "Nice to Have" : "Post-MVP"}
              </div>
            </div>
          ))}
        </div>

        {/* filters */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-6 space-y-2.5 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Filters</span>
            <button
              onClick={() => {
                setSelCats(new Set(categories))
                setSelPri(new Set(priorities))
                setSelEff(new Set(efforts))
                setSelImp(new Set(impacts))
                setSelStr(new Set(strategics))
              }}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
            >
              Reset all
            </button>
          </div>
          <FilterPills label="Priority" options={priorities} selected={selPri} onToggle={(v) => toggle(selPri, v, setSelPri)} palette={priorityColors} />
          <FilterPills label="Effort" options={efforts} selected={selEff} onToggle={(v) => toggle(selEff, v, setSelEff)} palette={effortColors} />
          <FilterPills label="Impact" options={impacts} selected={selImp} onToggle={(v) => toggle(selImp, v, setSelImp)} palette={impactColors} />
          <FilterPills label="Strategic" options={strategics} selected={selStr} onToggle={(v) => toggle(selStr, v, setSelStr)} palette={strategicColors} />
          <FilterPills label="Category" options={categories} selected={selCats} onToggle={(v) => toggle(selCats, v, setSelCats)} />
        </div>

        {/* group by */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Group by:</span>
          {(["none", "category", "mvp_priority"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                groupBy === g
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {g === "none" ? "None" : g === "category" ? "Category" : "Priority"}
            </button>
          ))}
        </div>

        {/* table */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          {grouped ? (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    {group}
                  </span>
                  <span className="ml-2 text-xs text-zinc-400">{items.length}</span>
                </div>
                {renderTable(items)}
              </div>
            ))
          ) : (
            renderTable(sorted)
          )}
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-zinc-400">No items match current filters</div>
          )}
        </div>

        {/* legend */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">Effort:</span> E0 trivial &rarr; E4 major project
          </div>
          <div>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">MVP Priority:</span> P0 must have &rarr; P3 post-MVP
          </div>
          <div>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">Impact:</span> UX | Admin | Revenue | Strategic | DX
          </div>
          <div>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">Strategic:</span> S0 no alignment &rarr; S4 core to vision
          </div>
        </div>
      </div>
    </div>
  )
}
