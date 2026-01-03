// app/drafts/DraftsGrid.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type DraftRow = {
  id: string
  status: "draft" | "committed" | "archived"
  committed_lead_id: string | null
  committed_at: string | null

  company_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  estimated_spend: number | null
  source: string | null

  buyer_quality: number | null
  deal_simplicity: number | null
  strategic_value: number | null
  momentum: number | null
  morale_risk: number | null

  score: number
  recommended_action: "pursue" | "review" | "deprioritise" | "kill"
  positive_reasons: string[]
  negative_reasons: string[]
}

type EditableKey =
  | "company_name"
  | "contact_name"
  | "email"
  | "phone"
  | "estimated_spend"
  | "source"
  | "buyer_quality"
  | "deal_simplicity"
  | "strategic_value"
  | "momentum"
  | "morale_risk"

const COLUMNS: Array<{
  key: EditableKey | "score" | "recommended_action"
  label: string
  width: number
  kind: "text" | "number" | "readonly"
}> = [
  { key: "company_name", label: "Company", width: 220, kind: "text" },
  { key: "contact_name", label: "Contact", width: 170, kind: "text" },
  { key: "email", label: "Email", width: 240, kind: "text" },
  { key: "phone", label: "Phone", width: 160, kind: "text" },
  { key: "estimated_spend", label: "Spend", width: 120, kind: "number" },
  { key: "source", label: "Source", width: 160, kind: "text" },

  { key: "buyer_quality", label: "Buyer", width: 90, kind: "number" },
  { key: "deal_simplicity", label: "Simplicity", width: 110, kind: "number" },
  { key: "strategic_value", label: "Strategic", width: 100, kind: "number" },
  { key: "momentum", label: "Momentum", width: 100, kind: "number" },
  { key: "morale_risk", label: "Morale", width: 90, kind: "number" },

  { key: "score", label: "Score", width: 90, kind: "readonly" },
  { key: "recommended_action", label: "Action", width: 140, kind: "readonly" },
]

function clampMetric(v: number | null) {
  if (v === null || Number.isNaN(v)) return null
  return Math.max(1, Math.min(5, Math.trunc(v)))
}

function parseNumberOrNull(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export default function DraftsGrid() {
  const router = useRouter()

  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  )

  const saveTimers = useRef<Record<string, any>>({})
  const dirtyMap = useRef<Record<string, Partial<Record<EditableKey, any>>>>({})

  async function load() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("lead_drafts_scored")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) {
      setError(error.message)
      setRows([])
      setLoading(false)
      return
    }

    setRows((data as DraftRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function toggleAllDrafts(checked: boolean) {
    const next: Record<string, boolean> = {}
    for (const r of rows) {
      if (r.status === "draft") next[r.id] = checked
    }
    setSelectedIds(next)
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => ({ ...prev, [id]: checked }))
  }

  function setCellLocal(id: string, key: EditableKey, value: any) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? ({ ...r, [key]: value } as DraftRow) : r))
    )
  }

  function scheduleSave(id: string) {
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])

    saveTimers.current[id] = setTimeout(async () => {
      const patch = dirtyMap.current[id]
      if (!patch || Object.keys(patch).length === 0) return

      dirtyMap.current[id] = {}

      const { error } = await supabase.from("lead_drafts").update(patch).eq("id", id)
      if (error) {
        setError(`Save failed: ${error.message}`)
        return
      }

      await load()
    }, 350)
  }

  function editCell(id: string, key: EditableKey, raw: string) {
    let nextValue: any = raw

    if (key === "estimated_spend") {
      nextValue = parseNumberOrNull(raw)
    } else if (
      key === "buyer_quality" ||
      key === "deal_simplicity" ||
      key === "strategic_value" ||
      key === "momentum" ||
      key === "morale_risk"
    ) {
      nextValue = clampMetric(parseNumberOrNull(raw))
    } else {
      nextValue = raw.trim() === "" ? null : raw
    }

    setCellLocal(id, key, nextValue)

    dirtyMap.current[id] = {
      ...(dirtyMap.current[id] ?? {}),
      [key]: nextValue,
    }

    scheduleSave(id)
  }

  async function addBlankRow() {
    setError(null)
    const { data, error } = await supabase
      .from("lead_drafts")
      .insert([{ status: "draft" }])
      .select("*")
      .single()

    if (error) {
      setError(error.message)
      return
    }

    await load()
    if (data?.id) setSelectedIds((prev) => ({ ...prev, [data.id]: true }))
  }

  async function commitSelected() {
    setError(null)

    const draftIds = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([id]) => id)

    if (draftIds.length === 0) return

    const { error } = await supabase.rpc("commit_lead_drafts", {
      draft_ids: draftIds,
    })

    if (error) {
      setError(error.message)
      return
    }

    setSelectedIds({})
    router.push("/")
  }

  const headerStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    background: "white",
    zIndex: 2,
    borderBottom: "1px solid #eaeaea",
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* UI unchanged */}
      {/* ...rest of render stays exactly the same */}
    </div>
  )
}
