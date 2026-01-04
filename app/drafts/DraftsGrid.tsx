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
  const router = useRouter() // ✅ added

  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  )

  // Track pending saves per row
  const saveTimers = useRef<Record<string, any>>({})
  const dirtyMap = useRef<Record<string, Partial<Record<EditableKey, any>>>>({})

  async function load() {
  setLoading(true)
  setError(null)

  const { data, error } = await supabase
    .from("lead_drafts_scored")
    .select("*")
    .eq("status", "draft")
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

      // clear dirty BEFORE request to avoid loops
      dirtyMap.current[id] = {}

      const { error } = await supabase.from("lead_drafts").update(patch).eq("id", id)

      if (error) {
        setError(`Save failed: ${error.message}`)
        return
      }

      // refresh scored view row values (score/action/reasons)
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

    // reload scored view so new row includes score/action
    await load()

    // auto-select new row
    if (data?.id) setSelectedIds((prev) => ({ ...prev, [data.id]: true }))
  }

  async function commitSelected() {
    setError(null)

    const draftIds = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([id]) => id)

    if (draftIds.length === 0) return

    const { error } = await supabase.rpc("commit_lead_drafts", { draft_ids: draftIds })
    if (error) {
      setError(error.message)
      return
    }

    setSelectedIds({})
    router.push("/") // ✅ Option A: go back to cards page
  }
  
  async function deleteSelectedDrafts() {
  setError(null)

  const draftIds = Object.entries(selectedIds)
    .filter(([, v]) => v)
    .map(([id]) => id)

  if (draftIds.length === 0) return

  const confirmed = window.confirm(
    `Delete ${draftIds.length} draft(s)? This cannot be undone.`
  )
  if (!confirmed) return

  const { error } = await supabase.rpc("delete_lead_drafts", {
    draft_ids: draftIds,
  })

  if (error) {
    setError(error.message)
    return
  }

  setSelectedIds({})
  await load()
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
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={addBlankRow}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #e6e6e6",
            background: "white",
            cursor: "pointer",
          }}
        >
          + New draft
        </button>

        <button
          onClick={commitSelected}
          disabled={selectedCount === 0}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #e6e6e6",
            background: selectedCount === 0 ? "#f6f6f6" : "white",
            cursor: selectedCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          Commit selected ({selectedCount})
        </button>

        <button
          onClick={load}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #e6e6e6",
            background: "white",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.7 }}>
          {loading ? "Loading…" : `${rows.length} rows`}
        </div>
      </div>

      {error && (
        <div
          style={{
            border: "1px solid #ffd3d3",
            background: "#fff5f5",
            padding: 10,
            borderRadius: 10,
            color: "#8a1f1f",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          overflow: "auto",
          border: "1px solid #eaeaea",
          borderRadius: 14,
        }}
      >
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content" }}>
          <thead style={headerStyle}>
            <tr>
              <th
                style={{
                  ...headerStyle,
                  textAlign: "left",
                  padding: 10,
                  minWidth: 50,
                  borderRight: "1px solid #f0f0f0",
                }}
              >
                <input
                  type="checkbox"
                  onChange={(e) => toggleAllDrafts(e.target.checked)}
                  checked={
                    rows.filter((r) => r.status === "draft").length > 0 &&
                    rows
                      .filter((r) => r.status === "draft")
                      .every((r) => selectedIds[r.id])
                  }
                />
              </th>

              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  style={{
                    ...headerStyle,
                    textAlign: "left",
                    padding: 10,
                    minWidth: c.width,
                    borderRight: "1px solid #f0f0f0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </th>
              ))}

              <th
                style={{
                  ...headerStyle,
                  textAlign: "left",
                  padding: 10,
                  minWidth: 140,
                  whiteSpace: "nowrap",
                }}
              >
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const isDraft = r.status === "draft"
              const isSelected = !!selectedIds[r.id]

              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: 10, borderRight: "1px solid #f7f7f7" }}>
                    <input
                      type="checkbox"
                      disabled={!isDraft}
                      checked={isSelected}
                      onChange={(e) => toggleOne(r.id, e.target.checked)}
                    />
                  </td>

                  {COLUMNS.map((c) => {
                    const value = (r as any)[c.key]

                    if (c.kind === "readonly") {
                      return (
                        <td
                          key={c.key}
                          style={{
                            padding: 10,
                            borderRight: "1px solid #f7f7f7",
                            opacity: 0.85,
                            whiteSpace: "nowrap",
                          }}
                          title={
                            c.key === "recommended_action"
                              ? [
                                  ...(r.positive_reasons ?? []).map((x) => `+ ${x}`),
                                  ...(r.negative_reasons ?? []).map((x) => `- ${x}`),
                                ].join("\n")
                              : undefined
                          }
                        >
                          {value ?? ""}
                        </td>
                      )
                    }

                    return (
                      <td
                        key={c.key}
                        style={{
                          padding: 0,
                          borderRight: "1px solid #f7f7f7",
                        }}
                      >
                        <input
                          disabled={!isDraft}
                          defaultValue={value ?? ""}
                          onChange={(e) => editCell(r.id, c.key as EditableKey, e.target.value)}
                          style={{
                            width: c.width,
                            padding: "10px 10px",
                            border: "none",
                            outline: "none",
                            background: isDraft ? "white" : "#fafafa",
                          }}
                        />
                      </td>
                    )
                  })}

                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                    {r.status === "committed" ? (
                      <span style={{ opacity: 0.8 }}>
                        committed
                        {r.committed_at
                          ? ` · ${new Date(r.committed_at).toLocaleString()}`
                          : ""}
                      </span>
                    ) : (
                      <span style={{ opacity: 0.8 }}>{r.status}</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} style={{ padding: 18, opacity: 0.7 }}>
                  No drafts yet. Click <b>New draft</b>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
        Notes: Metrics clamp to 1–5. Score/action is computed by{" "}
        <code>lead_drafts_scored</code>. Saving is debounced.
      </div>
    </div>
  )
}
