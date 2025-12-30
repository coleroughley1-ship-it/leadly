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

export default function DecisionInner() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("lead_id")

  const [lead, setLead] = useState<LeadDecision | null>(null)
  const [override, setOverride] = useState<DecisionOverride | null>(null)

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

    const fetchDecisionAndOverride = async () => {
      setLoading(true)

      // 1) Fetch the decision
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

      // Default the override dropdown to whatever the system recommended
      setOverrideAction((decisionRes.data as LeadDecision).recommended_action)

      // 2) Fetch the latest override (if any)
      const overrideRes = await supabase
        .from("decision_overrides")
        .select("lead_id, override_action, override_reason, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (!overrideRes.error && overrideRes.data && overrideRes.data.length > 0) {
        setOverride(overrideRes.data[0] as DecisionOverride)
      } else {
        setOverride(null)
      }

      setLoading(false)
    }

    fetchDecisionAndOverride()
  }, [leadId])

  const submitOverride = async () => {
    if (!lead || !leadId) return

    setSaving(true)
    setSaveMsg(null)

    const reasonClean = overrideReason.trim()
    if (reasonClean.length > 280) {
      setSaving(false)
      setSaveMsg("Reason is too long (max 280 characters).")
      return
    }

    const { error } = await supabase.from("decision_overrides").insert([
      {
        lead_id: leadId,
        override_action: overrideAction,
        override_reason: reasonClean || null,
      },
    ])

    if (error) {
      setSaving(false)
      setSaveMsg(error.message)
      return
    }

    // Re-fetch latest override so UI stays truthful
    const overrideRes = await supabase
      .from("decision_overrides")
      .select("lead_id, override_action, override_reason, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!overrideRes.error && overrideRes.data?.length) {
      setOverride(overrideRes.data[0] as DecisionOverride)
    }

    setOverrideReason("")
    setSaving(false)
    setSaveMsg("Override saved.")
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
      <div className="mb-6">
        <a href="/" className="text-sm text-gray-600 hover:underline">
          ← Back to feed
        </a>
      </div>

      <h1 className="text-2xl font-semibold mb-1">{lead.company_name}</h1>

      <div className="flex items-center gap-3 mb-2">
        <ActionPill action={effectiveAction} />
        <span className="text-sm text-gray-600">Score: {lead.score}</span>
      </div>

      {/* System vs override context */}
      <div className="text-sm text-gray-600 mb-6">
        <span className="font-medium text-gray-700">System:</span>{" "}
        {lead.recommended_action.toUpperCase()}
        {override ? (
          <>
            {" "}
            <span className="mx-2">•</span>
            <span className="font-medium text-gray-700">Overridden:</span>{" "}
            {override.override_action.toUpperCase()}{" "}
            <span className="text-gray-500">
              ({new Date(override.created_at).toLocaleString()})
            </span>
          </>
        ) : null}
      </div>

      <section className="mb-8 bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-3">Override decision</h2>

        <div className="flex flex-wrap gap-3 items-center">
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
            className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save override"}
          </button>

          {saveMsg ? (
            <span className="text-sm text-gray-600">{saveMsg}</span>
          ) : null}
        </div>

        <div className="mt-3">
          <textarea
            className="w-full border rounded p-3 text-sm"
            placeholder="Reason (optional). Keep it short."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={3}
          />
          <div className="mt-1 text-xs text-gray-500">
            {overrideReason.trim().length}/280
          </div>
        </div>

        {override?.override_reason ? (
          <div className="mt-4 text-sm text-gray-700">
            <span className="font-medium">Latest reason:</span>{" "}
            {override.override_reason}
          </div>
        ) : null}
      </section>

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
