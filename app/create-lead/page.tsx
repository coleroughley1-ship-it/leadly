"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function CreateLeadPage() {
  const router = useRouter()

  const [companyName, setCompanyName] = useState("")
  const [buyerQuality, setBuyerQuality] = useState<number | "">("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName.trim()) {
      setError("Company name is required")
      return
    }

    setSaving(true)
    setError(null)

    const { error } = await supabase.from("Leads").insert({
      company_name: companyName,
      buyer_quality: buyerQuality === "" ? null : buyerQuality,
    })

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push("/")
  }

  return (
    <main className="max-w-md mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Create Lead</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Company name *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">
            Buyer quality (0–5, optional)
          </label>
          <input
            type="number"
            min={0}
            max={5}
            className="w-full border rounded px-3 py-2"
            value={buyerQuality}
            onChange={(e) =>
              setBuyerQuality(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create lead"}
        </button>
      </form>
    </main>
  )
}
