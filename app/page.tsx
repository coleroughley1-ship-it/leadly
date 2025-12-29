import { supabase } from "@/lib/supabase"

export default async function Page() {
  const { data: leads, error } = await supabase
    .from("leads_scored")
    .select("*")

  if (error) {
    return (
      <main className="p-10">
        <pre>{error.message}</pre>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-8">
        Leadly — Decision Feed
      </h1>

      <div className="space-y-6">
        {leads.map((lead) => (
          <div
            key={lead.lead_id}
            className="bg-white border rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-medium">
                {lead.company_name}
              </h2>

              <span className="text-sm font-semibold">
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
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
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

function ActionPill({ action }: { action: string }) {
  const styles: Record<string, string> = {
    pursue: "bg-green-100 text-green-800",
    review: "bg-amber-100 text-amber-800",
    deprioritise: "bg-gray-100 text-gray-700",
    kill: "bg-red-100 text-red-800",
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles[action]}`}>
      {action.toUpperCase()}
    </span>
  )
}

