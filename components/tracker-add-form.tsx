// Formulaire d'entrée manuelle de stats.
// YouTube : abonnés / heures 12 mois / vues (complément à la sync auto).
// TikTok (Module 8) : abonnés / vues 30j / Creator Rewards estimé / commissions TikTok Shop.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Champs du formulaire (tous string — les champs inutilisés sont laissés à '').
interface TrackerFormState {
  subscribers: string
  watchHours: string
  views: string
  creatorRewards: string
  shopCommissions: string
}

const EMPTY_FORM: TrackerFormState = {
  subscribers: '',
  watchHours: '',
  views: '',
  creatorRewards: '',
  shopCommissions: '',
}

export default function TrackerAddForm({
  channelId,
  platform = 'youtube',
}: {
  channelId: string
  platform?: 'youtube' | 'tiktok'
}) {
  const router = useRouter()
  const isTikTok = platform === 'tiktok'
  const [form, setForm] = useState<TrackerFormState>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // Seuls les champs de la plateforme sont envoyés (les autres restent à '').
      const payload = isTikTok
        ? { subscribers: form.subscribers, views: form.views, creatorRewards: form.creatorRewards, shopCommissions: form.shopCommissions }
        : { subscribers: form.subscribers, watchHours: form.watchHours, views: form.views }
      const res = await fetch('/api/tracker/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, ...payload }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Erreur')
        return
      }
      setForm(EMPTY_FORM)
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
      {isTikTok ? (
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
            Vues 30 derniers jours
            <input
              type="number"
              min={0}
              required
              style={inputStyle}
              value={form.views}
              onChange={(e) => setForm((f) => ({ ...f, views: e.target.value }))}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
            Creator Rewards estimé (€)
            <input
              type="number"
              min={0}
              step="0.01"
              style={inputStyle}
              placeholder="0.00"
              value={form.creatorRewards}
              onChange={(e) => setForm((f) => ({ ...f, creatorRewards: e.target.value }))}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
            TikTok Shop commissions (€)
            <input
              type="number"
              min={0}
              step="0.01"
              style={inputStyle}
              placeholder="0.00"
              value={form.shopCommissions}
              onChange={(e) => setForm((f) => ({ ...f, shopCommissions: e.target.value }))}
            />
          </label>
        </div>
      ) : (
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
      )}
      {error && <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Enregistrement…' : '+ Enregistrer'}
        </button>
      </div>
    </form>
  )
}
