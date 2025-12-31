"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Action = "pursue" | "review" | "deprioritise" | "kill"
type OutcomeStatus = "won" | "lost" | "pending"

type LeadDecisionRow = {
  lead_id: string
  company_name: string
  score: number

  // system decision
  recommended_action: Action

  positive_reasons: string[]
  negative_reasons: string[]

  // override layer
  effective_action: Action
  latest_override_action: Action | null
  latest_override_reason: string | null
  latest_override_created_at: string | null

  // outcome layer
  latest_outcome: "won" | "lost" | "no_response" | null
  outcome_status: OutcomeStatus
}

export default function Page() {
  const [leads, setLeads] = useState<LeadDecisionRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [actionFilter, setActionFilter] = useState<"all" | Action>("all")
  const [scoreFilter, setScoreFilter] = useState<
    "all" | "high" | "mid" | "low"
  >("all")

  // Sorting
  const [scoreSort, setScoreSort] = useState<"score_desc" | "score_asc">(
    "score_desc"
  )
  const [timeSort, setTimeSort] = useState<"latest" | "oldest">("latest")

  // Default execution mode
  const [outcomeFilter, setOutcomeFilter] = useState<
    "all" | "won" | "lost" | "pending"
  >("pending")

  const logDecisions = async (rows: LeadDecisionRow[]) => {
    if (!rows.length) return

    const payload = rows.map((lead) => ({
      lead_id: lead.lead_id,
      score: lead.score,
      recommended_action: lead.effective_action,
    }))

    await supabase.from("decision_logs").insert(payload)
  }

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from("leads_effective")
        .select("*")

      if (error) {
        setError(error.message)
      } else {
        const rows = (data || []) as LeadDecisionRow[]
        setLeads(rows)
        await logDecisions(rows)
      }

      setLoading(false)
    }

    fetchLeads()
  }, [])

  // Outcome counts
  const outcomeCounts = useMemo(() => {
    return {
      all: leads.length,
      pending: leads.filter((l) => l.outcome_status === "pending").length,
      won: leads.filter((l) => l.outcome_status === "won").length,
      lost: leads.filter((l) => l.outcome_status === "lost").length,
    }
  }, [leads])

  const visibleLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (actionFilter !== "all" && lead.effective_action !== actionFilter)
          return false

        if (
          outcomeFilter !== "all" &&
          lead.outcome_status !== outcomeFilter
        )
          return false

        if (scoreFilter === "high" && lead.score < 80) return false
        if (scoreFilter === "mid" && (lead.score < 60 || lead.score >= 80))
          return false
        if (scoreFilter === "low" && lead.score >= 60) return false

        return true
      })
      .sort((a, b) => {
        // Time-based sorting (primary)
        if (timeSort === "latest" || timeSort === "oldest") {
          const aTime = a.latest_override_created_at
            ? new Date(a.latest_override_created_at).getTime()
            : 0
          const bTime = b.latest_override_created_at
            ? new Date(b.latest_override_created_at).getTime()
            : 0

          if (aTime !== bTime) {
            return timeSort === "latest" ? bTime - aTime : aTime - bTime
          }
        }

        // Score-based sorting (secondary)
        if (scoreSort === "score_desc") return b.score - a.score
        if (scoreSort === "score_asc") return a.score - b.score
        return 0
      })
  }, [
    leads,
    actionFilter,
    outcomeFilter,
    scoreFilter,
    scoreSort,
    timeSort,
  ])

  if (error) {
    return (
      <main className="p-10">
        <h1 className="text-xl font-semibold mb-4 text-red-600">
          Leadly — Error
        </h1>
        <pre className="text-sm">{error}</pre>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-2">Leadly — Decision Feed</h1>

      {/* COUNTS BAR */}
      <div className="flex gap-4 text-sm mb-6">
        {[
          ["all", outcomeCounts.all],
          ["pending", outcomeCounts.pending],
          ["won", outcomeCounts.won],
          ["lost", outcomeCounts.lost],
        ].map(([key, count]) => (
          <button
            key={key}
            onClick={() => setOutcomeFilter(key as any)}
            className="cursor-pointer hover:underline"
          >
            {key.charAt(0).toUpperCase() + key.slice(1)} ({count})
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="border rounded px-3 py-2 text-sm cursor-pointer"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as any)}
        >
          <option value="all">All actions</option>
          <option value="pursue">Pursue</option>
          <option value="review">Review</option>
          <option value="deprioritise">Deprioritise</option>
          <option value="kill">Kill</option>
        </select>

        <select
          className="border rounded px-3 py-2 text-sm cursor-pointer"
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value as any)}
        >
          <option value="all">All scores</option>
          <option value="high">80+</option>
          <option value="mid">60–79</option>
          <option value="low">&lt;60</option>
        </select>

        <select
          className="border rounded px-3 py-2 text-sm cursor-pointer"
          value={scoreSort}
          onChange={(e) => setScoreSort(e.target.value as any)}
        >
          <option value="score_desc">Highest score</option>
          <option value="score_asc">Lowest score</option>
        </select>

        <select
          className="border rounded px-3 py-2 text-sm cursor-pointer"
          value={timeSort}
          onChange={(e) => setTimeSort(e.target.value as any)}
        >
          <option value="latest">Latest activity</option>
          <option value="oldest">Oldest activity</option>
        </select>

        <select
          className="border rounded px-3 py-2 text-sm cursor-pointer"
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value as any)}
        >
          <option value="all">All outcomes</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Loading decisions…</p>
      )}

      <div className="space-y-6">
        {visibleLeads.map((lead) => {
          const isOverridden =
            lead.latest_override_action &&
            lead.latest_override_action !== lead.recommended_action

          const recencyText = lead.latest_override_created_at
            ? formatTimeAgo(lead.latest_override_created_at)
            : null

          return (
            <Link
              key={lead.lead_id}
              href={`/decision?lead_id=${lead.lead_id}`}
              className="block cursor-pointer"
            >
              <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow transition">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-medium leading-tight">
                    {lead.company_name}
                  </h2>

                  <span className="text-sm font-semibold text-gray-700">
                    {lead.score}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <ActionPill action={lead.effective_action} />
                  <OutcomePill status={lead.outcome_status} />

                  {isOverridden ? (
                    <span className="text-xs text-gray-600">
                      System: {lead.recommended_action.toUpperCase()} • Overridden:{" "}
                      {lead.latest_override_action?.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      System: {lead.recommended_action.toUpperCase()}
                    </span>
                  )}
                </div>

                {recencyText && (
                  <p className="text-xs text-gray-500 mt-2">
                    {lead.outcome_status === "pending"
                      ? `Waiting ${recencyText}`
                      : `${lead.outcome_status.toUpperCase()} ${recencyText}`}
                  </p>
                )}

                <div className="mt-5">
                  <p className="text-sm font-medium mb-2">Why this decision</p>
                  <ul className="space-y-1 text-sm text-gray-800">
                    {lead.positive_reasons?.slice(0, 3).map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>

                {lead.negative_reasons?.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-sm text-gray-600 cursor-pointer">
                      Risks
                    </summary>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {lead.negative_reasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}

function formatTimeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function ActionPill({ action }: { action: Action }) {
  const styles: Record<Action, string> = {
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

function OutcomePill({ status }: { status: OutcomeStatus }) {
  const styles: Record<OutcomeStatus, string> = {
    won: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-600",
  }

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
    >
      {status.toUpperCase()}
    </span>
  )
}
