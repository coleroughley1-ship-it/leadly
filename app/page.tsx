"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type LeadDecision = {
  lead_id: string
  company_name: string
  score: number
  recommended_action: "pursue" | "review" | "deprioritise" | "kill"
  positive_reasons: string[]
  negative_reasons: string[]
}

export default function Page() {
  const [leads, setLeads] = useState<LeadDecision[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters + sorting
  const [actionFilter, setActionFilter] =
    useState<"all" | "pursue" | "review" | "deprioritise" | "kill">("all")

  const [scoreFilter, setScoreFilter] =
    useState<"all" | "high" | "mid" | "low">("all")

  const [sortBy, setSortBy] =
    useState<"score_desc" | "score_asc">("score_desc")

  // Decision logging
  const logDecisions = async (leads: LeadDecision[]) => {
    if (!leads.length) return

    const payload = leads.map((lead) => ({
      lead_id: lead.lead_id,
      score: lead.score,
      recommended_action: lead.recommended_action,
    }))

    await supabase.from("decision_logs").insert(payload)
  }

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from("leads_scored")
        .select("*")

      if (error) {
        setError(error.message)
      } else {
        setLeads(data || [])
        await logDecisions(data || [])
      }

      setLoading(false)
    }

    fetchLeads()
  }, [])

  const visibleLeads = leads
    .filter((lead) => {
      if (actionFilter !== "all" && lead.recommended_action !== actionFilter)
        return false

      if (scoreFilter === "high" && lead.score < 80) return false
      if (scoreFilter === "mid" && (lead.score < 60 || lead.score >= 80))
        return false
      if (scoreFilter === "low" && lead.score >= 60) return false

      return true
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") return b.score - a.score
      if (sortBy === "score_asc") return a.score - b.score
      return 0
    })

  if (error) {
    return (
      <main className="p-10">
        <h1 className="text-xl font-semibold text-red-600 mb-4">
          Leadly — Error
        </h1>
        <pre className="text-sm">{error}</pre>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">
        Leadly — Decision Feed
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="border rounded px-3 py-2 text-sm"
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
          className="border rounded px-3 py-2 text-sm"
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value as any)}
        >
          <option value="all">All scores</option>
          <option value="high">80+</option>
          <option value="mid">60–79</option>
          <option value="low">&lt;60</option>
        </select>

        <select
          className="border rounded px-3 py-2 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
        >
          <option value="score_desc">Highest score</option>
          <option value="score_asc">Lowest score</option>
        </select>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Loading decisions…</p>
      )}

      <div className="space-y-6">
        {visibleLeads.map((lead) => (
          <Link
            key={lead.lead_id}
            href={`/decision/${lead.lead_id}`}
            className="block"
          >
            <div className="bg-white border rounded-xl p-6 shadow-sm hover:border-gray-400 cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-medium leading-tight">
                  {lead.company_name}
                </h2>
                <span className="text-sm font-semibold text-gray-700">
                  {lead.score}
                </span>
              </div>

              <div className="mt-3">
                <ActionPill action={lead.recommended_action} />
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium mb-2">
                  Why this decision
                </p>
                <ul className="space-y-1 text-sm">
                  {lead.positive_reasons.slice(0, 3).map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>

              {lead.negative_reasons.length > 0 && (
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
        ))}
      </div>
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
