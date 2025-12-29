'use client'

import { supabase } from '@/lib/supabase'

export default function Test() {
  const run = async () => {
    const res = await supabase
      .from('leads_scored')
      .select('*')
      .limit(1)

    console.log('RESULT:', res)
  }

  return (
    <button onClick={run}>
      Run Supabase Test
    </button>
  )
}
