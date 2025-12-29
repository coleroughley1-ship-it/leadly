"use client"

import { useSearchParams } from "next/navigation"
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

export default function DecisionInner() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("lead_id")

  const [lead, setLead] = useState<LeadDecision | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leadId) {
      setError("Missing lead_id")
      setLoading(false)
      return
    }

    const fetchDecision = async () => {
      const { data, error } = await supabase
        .from("leads_scored")
        .select("*")
        .eq("lead_id", leadId)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setLead(data)
      }

      setLoading(false)
    }

    fetchDecision()
  }, [leadId])

  if (loading) {
    return (
      <main className="p-10 text-sm text-gray-500">
        Loading decision…
      </main>
    )
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
      <h1 className="text-2xl font-semibold mb-1">
        {lead.company_name}
      </h1>

      <div className="flex items-center gap-4 mb-6">
        <ActionPill action={lead.recommended_action} />
        <span className="text-sm text-gray-600">
          Score: {lead.score}
        </span>
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-medium mb-2">
          Why this decision
        </h2>

        <ul className="space-y-1 text-sm">
          {lead.positive_reasons.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </section>

      {lead.negative_reasons.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-2 text-gray-700">
            Risks
          </h2>

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
