// Formulaire d'entrée manuelle de stats (complément à la sync automatique).

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TrackerAddForm({ channelId }: { channelId: string }) {
  const router = useRouter()
  const [form, setForm] = useState({ subscribers: '', watchHours: '', views: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/tracker/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, ...form }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Erreur')
        return
      }
      setForm({ subscribers: '', watchHours: '', views: '' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: '0.9rem',
    width: '100%',
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '0.7rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.7rem' }}>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
          Abonnés
          <input
            type="number"
            min={0}
            required
            style={inputStyle}
            value={form.subscribers}
            onChange={(e) => setForm((f) => ({ ...f, subscribers: e.target.value }))}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
          Heures 12 mois
          <input
            type="number"
            min={0}
            required
            style={inputStyle}
            value={form.watchHours}
            onChange={(e) => setForm((f) => ({ ...f, watchHours: e.target.value }))}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
          Vues totales
          <input
            type="number"
            min={0}
            required
            style={inputStyle}
            value={form.views}
            onChange={(e) => setForm((f) => ({ ...f, views: e.target.value }))}
          />
        </label>
      </div>
      {error && <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Enregistrement…' : '+ Enregistrer'}
        </button>
      </div>
    </form>
  )
}
