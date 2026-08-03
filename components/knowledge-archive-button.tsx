// Bouton "Archiver" pour une entrée de connaissance.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function KnowledgeArchiveButton({ entryId }: { entryId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function archive() {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/knowledge/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-danger"
      onClick={archive}
      disabled={busy}
      style={{ padding: '3px 10px', fontSize: '0.72rem', opacity: busy ? 0.6 : 0.75 }}
    >
      Archiver
    </button>
  )
}
