'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from('leads_scored')
        .select('*')
        .limit(10)

      if (error) {
        console.error('Supabase error:', error.message)
      } else {
        setLeads(data || [])
      }

      setLoading(false)
    }

    fetchLeads()
  }, [])

  return (
    <main style={{ padding: 40 }}>
      <h1>Leadly – Decision Feed</h1>

      {loading && <p>Loading…</p>}

      {!loading && (
        <pre>{JSON.stringify(leads, null, 2)}</pre>
      )}
    </main>
  )
}
