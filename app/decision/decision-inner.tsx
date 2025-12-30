"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type LeadDecision = {
  lead_id: string
  company_name: string
  score: number
  recommended_action: "pursue" | "review" | "deprioritise" | "kill"
  positive_reasons: string[]
  negative_reasons: string[]
}

type DecisionOverride = {
  id: string
  lead_id: string
  override_action: LeadDecision["recommended_action"]
  override_reason: string | null
  created_at: string
}

export default function DecisionInner() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("lead_id")

  const [lead, setLead] = useState<LeadDecision | null>(null)
  const [latestOverride, setLatestOverride] = useState<DecisionOverride | null>(null)
  const [history, setHistory] = useState<DecisionOverride[]>([])

  const [overrideAction, setOverrideAction] =
    useState<LeadDecision["recommended_action"]>("review")
  const [overrideReason, setOverrideReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ FINAL effective decision logic (authoritative)
  const effectiveAction = useMemo(() => {
    if (!lead) return "review"

    if (!latestOverride) {
      return lead.recommended_action
    }

    if (latestOverride.override_action === lead.recommended_action) {
      return lead.recommended_action
    }

    return latestOverride.override_action
  }, [lead, latestOverride])

  useEffect(() => {
    if (!leadId) {
      setError("Missing lead_id")
      setLoading(false)
      return
    }

    const fetchAll = async () => {
      setLoading(true)

      // 1️⃣ Fetch system decision
      const decisionRes = await supabase
        .from("leads_scored")
        .select("*")
        .eq("lead_id", leadId)
        .single()

      if (decisionRes.error) {
        setError(decisionRes.error.message)
        setLoading(false)
        return
      }

      setLead(decisionRes.data)
      setOverrideAction(decisionRes.data.recommended_action)

      // 2️⃣ Fetch override history
      const historyRes = await supabase
        .from("decision_overrides")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })

      if (!historyRes.error && historyRes.data.length > 0) {
        setLatestOverride(historyRes.data[0])
        setHistory(historyRes.data)
      } else {
        setLatestOverride(null)
        setHistory([])
      }

      setLoading(false)
    }

    fetchAll()
  }, [leadId])

  const saveOverride = async () => {
    if (!lead || !leadId) return

    if (overrideReason.length > 280) {
      setMessage("Reason too long (max 280 characters).")
      return
    }

    setSaving(true)
    setMessage(null)

    const { error } = await supabase.from("decision_overrides").insert([
      {
        lead_id: leadId,
        override_action: overrideAction,
        override_reason: overrideReason.trim() || null,
      },
    ])

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setOverrideReason("")
    setSaving(false)
    setMessage("Override saved.")

    // Re-fetch history
    const historyRes = await supabase
      .from("decision_overrides")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })

    if (!historyRes.error && historyRes.data.length > 0) {
      setLatestOverride(historyRes.data[0])
      setHistory(historyRes.data)
    }
  }

  if (loading) {
    return <main className="p-10 text-sm text-gray-500">Loading decision…</main>
  }

  if (error || !lead) {
    return (
      <main className="p-10">
        <h1 className="text-lg font-semibold text-red-600 mb-2">
          Decision not found
        </h1>
        <p className="text-sm text-gray-600">{error}</p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <a href="/" className="text-sm text-gray-600 hover:underline mb-6 inline-block">
        ← Back to feed
      </a>

      <h1 className="text-2xl font-semibold mb-1">{lead.company_name}</h1>

      <div className="flex items-center gap-3 mb-2">
        <ActionPill action={effectiveAction} />
        <span className="text-sm text-gray-600">Score: {lead.score}</span>
      </div>

      {/* ✅ Correct system / override truth */}
      <div className="text-sm text-gray-600 mb-6">
        <strong>System:</strong> {lead.recommended_action.toUpperCase()}
        {latestOverride &&
        latestOverride.override_action !== lead.recommended_action ? (
          <>
            {" "}
            • <strong>Overridden:</strong>{" "}
            {latestOverride.override_action.toUpperCase()}
          </>
        ) : null}
      </div>

      {/* Override controls */}
      <section className="mb-8 bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-3">Override decision</h2>

        <div className="flex gap-3 items-center mb-3">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={overrideAction}
            onChange={(e) =>
              setOverrideAction(
                e.target.value as LeadDecision["recommended_action"]
              )
            }
          >
            <option value="pursue">Pursue</option>
            <option value="review">Review</option>
            <option value="deprioritise">Deprioritise</option>
            <option value="kill">Kill</option>
          </select>

          <button
            onClick={saveOverride}
            disabled={saving}
            className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save override"}
          </button>

          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>

        <textarea
          className="w-full border rounded p-3 text-sm"
          placeholder="Reason (optional)"
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          rows={3}
        />

        <div className="text-xs text-gray-500 mt-1">
          {overrideReason.length}/280
        </div>
      </section>

      {/* Decision history */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Decision history</h2>

        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No overrides yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((event) => (
              <li key={event.id} className="border rounded-lg p-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">
                    Override → {event.override_action.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {event.override_reason && (
                  <p className="text-gray-600">“{event.override_reason}”</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reasons */}
      <section className="mb-6">
        <h2 className="text-sm font-medium mb-2">Why this decision</h2>
        <ul className="space-y-1 text-sm">
          {lead.positive_reasons.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </section>

      {lead.negative_reasons.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-2 text-gray-700">Risks</h2>
          <ul className="space-y-1 text-sm text-gray-600">
            {lead.negative_reasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function ActionPill({
  action,
}: {
  action: LeadDecision["recommended_action"]
}) {
  const styles: Record<string, string> = {
    pursue: "bg-green-100 text-green-800",
    review: "bg-amber-100 text-amber-800",
    deprioritise: "bg-gray-100 text-gray-700",
    kill: "bg-red-100 text-red-800",
  }

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles[action]}`}
    >
      {action.toUpperCase()}
    </span>
  )
}
