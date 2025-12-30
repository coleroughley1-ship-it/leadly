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
  lead_id: string
  override_action: LeadDecision["recommended_action"]
  override_reason: string | null
  created_at: string
}

type DecisionHistoryEvent = {
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
  const [override, setOverride] = useState<DecisionOverride | null>(null)
  const [history, setHistory] = useState<DecisionHistoryEvent[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Override form state
  const [overrideAction, setOverrideAction] =
    useState<LeadDecision["recommended_action"]>("review")
  const [overrideReason, setOverrideReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const effectiveAction = useMemo(() => {
    return override?.override_action ?? lead?.recommended_action ?? "review"
  }, [override, lead])

  useEffect(() => {
    if (!leadId) {
      setError("Missing lead_id")
      setLoading(false)
      return
    }

    const fetchAll = async () => {
      setLoading(true)

      // 1️⃣ Fetch decision
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

      setLead(decisionRes.data as LeadDecision)
      setOverrideAction(decisionRes.data.recommended_action)

      // 2️⃣ Fetch latest override
      const overrideRes = await supabase
        .from("decision_overrides")
        .select("lead_id, override_action, override_reason, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (!overrideRes.error && overrideRes.data?.length) {
        setOverride(overrideRes.data[0] as DecisionOverride)
      } else {
        setOverride(null)
      }

      // 3️⃣ Fetch full history
      const historyRes = await supabase
        .from("decision_overrides")
        .select("id, lead_id, override_action, override_reason, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })

      if (!historyRes.error && historyRes.data) {
        setHistory(historyRes.data as DecisionHistoryEvent[])
      }

      setLoading(false)
    }

    fetchAll()
  }, [leadId])

  const submitOverride = async () => {
    if (!lead || !leadId) return

    setSaving(true)
    setSaveMsg(null)

    if (overrideReason.length > 280) {
      setSaveMsg("Reason too long (max 280 characters).")
      setSaving(false)
      return
    }

    const { error } = await supabase.from("decision_overrides").insert([
      {
        lead_id: leadId,
        override_action: overrideAction,
        override_reason: overrideReason.trim() || null,
      },
    ])

    if (error) {
      setSaveMsg(error.message)
      setSaving(false)
      return
    }

    setOverrideReason("")
    setSaveMsg("Override saved.")
    setSaving(false)

    // Refresh data
    const { data } = await supabase
      .from("decision_overrides")
      .select("id, lead_id, override_action, override_reason, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })

    if (data) {
      setOverride(data[0] as DecisionOverride)
      setHistory(data as DecisionHistoryEvent[])
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

      <div className="text-sm text-gray-600 mb-6">
        <strong>System:</strong> {lead.recommended_action.toUpperCase()}
        {override && (
          <>
            {" "}
            • <strong>Overridden:</strong>{" "}
            {override.override_action.toUpperCase()}
          </>
        )}
      </div>

      {/* Override box */}
      <section className="mb-8 bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-3">Override decision</h2>

        <div className="flex gap-3 items-center mb-3">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={overrideAction}
            onChange={(e) =>
              setOverrideAction(e.target.value as LeadDecision["recommended_action"])
            }
          >
            <option value="pursue">Pursue</option>
            <option value="review">Review</option>
            <option value="deprioritise">Deprioritise</option>
            <option value="kill">Kill</option>
          </select>

          <button
            onClick={submitOverride}
            disabled={saving}
            className="px-4 py-2 rounded bg-black text-white text-sm"
          >
            {saving ? "Saving…" : "Save override"}
          </button>

          {saveMsg && <span className="text-sm text-gray-600">{saveMsg}</span>}
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
