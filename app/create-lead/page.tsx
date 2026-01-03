"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function CreateLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    company_name: "",
    buyer_quality: 3,
    deal_simplicity: 3,
    strategic_value: 3,
    momentum: 3,
    morale_risk: 3,
    can_receive_product: true,
    can_sell_product: true,
    has_capital: true,
  })

  const update = (key: string, value: any) =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = async () => {
    if (!form.company_name.trim()) {
      setError("Company name is required")
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.from("lead_drafts").insert({
      status: "draft",
      company_name: form.company_name,
      buyer_quality: form.buyer_quality,
      deal_simplicity: form.deal_simplicity,
      strategic_value: form.strategic_value,
      momentum: form.momentum,
      morale_risk: form.morale_risk,
      can_receive_product: form.can_receive_product,
      can_sell_product: form.can_sell_product,
      has_capital: form.has_capital,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push("/drafts")
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Create Lead</h1>

      {error && (
        <div className="mb-4 text-sm text-red-600">{error}</div>
      )}

      {/* Company */}
      <label className="block mb-4">
        <span className="text-sm font-medium">Company name *</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          value={form.company_name}
          onChange={(e) => update("company_name", e.target.value)}
        />
      </label>

      {/* Scoring sliders */}
      {[
        ["buyer_quality", "Buyer quality"],
        ["deal_simplicity", "Deal simplicity"],
        ["strategic_value", "Strategic value"],
        ["momentum", "Momentum"],
        ["morale_risk", "Morale risk"],
      ].map(([key, label]) => (
        <label key={key} className="block mb-4">
          <span className="text-sm font-medium">
            {label} (0–5)
          </span>
          <input
            type="range"
            min={0}
            max={5}
            value={(form as any)[key]}
            onChange={(e) => update(key, Number(e.target.value))}
            className="w-full"
          />
        </label>
      ))}

      {/* Capability toggles */}
      {[
        ["can_receive_product", "Can receive product"],
        ["can_sell_product", "Can sell product"],
        ["has_capital", "Has capital"],
      ].map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={(form as any)[key]}
            onChange={(e) => update(key, e.target.checked)}
          />
          <span className="text-sm">{label}</span>
        </label>
      ))}

      <button
        onClick={submit}
        disabled={loading}
        className="mt-6 px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create lead"}
      </button>
    </main>
  )
}
