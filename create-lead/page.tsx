"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function CreateLeadPage() {
  const router = useRouter()

  const [companyName, setCompanyName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!companyName.trim()) {
      setError("Company name is required")
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from("Leads")
      .insert({
        company_name: companyName
      })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // success → go back to feed
    router.push("/")
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Create Lead</h1>

      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Company name
        </label>

        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Evolution Fitness XL"
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 4
          }}
        />

        {error && (
          <p style={{ color: "red", marginTop: 12 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 20,
            padding: "10px 16px",
            background: "black",
            color: "white",
            borderRadius: 4,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Creating..." : "Create Lead"}
        </button>
      </form>
    </div>
  )
}

