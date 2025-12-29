"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from("leads_scored")
        .select("*")

      if (error) {
        setError(error.message)
      } else {
        setLeads(data || [])
      }

      setLoading(false)
    }

    fetchLeads()
  }, [])

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
      <h1 className="text-3xl font-bold mb-2 text-red-600">
        🔴 LEADLY DECISION FEED — NEW UI 🔴
      </h1>

      <p className="text-sm text-gray-500 mb-8">
        Leads loaded: {leads.length}
      </p>

      {loading && (
        <p className="text-sm text-gray-500">Loading decisions…</p>
      )}

      <div className="space-y-6">
        {leads.map((lead) => (
          <div
            key={lead.lead_id}
            className="bg-white border rounded-xl p-6 shadow-sm"
          >
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

              <ul className="space-y-1 text-sm text-gray-800">
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



