"use client"

import { Suspense } from "react"
import DecisionInner from "./decision-inner"

export default function DecisionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DecisionInner />
    </Suspense>
  )
}

function Loading() {
  return (
    <main className="p-10 text-sm text-gray-500">
      Loading decision…
    </main>
  )
}
