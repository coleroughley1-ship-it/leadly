// app/drafts/page.tsx
import DraftsGrid from "./DraftsGrid"

export default function DraftsPage() {
  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Drafts</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>
          Editable staging layer. Inline edit anything → live score preview → commit into Leads.
        </p>
      </div>

      <DraftsGrid />
    </div>
  )
}
