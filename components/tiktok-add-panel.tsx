// Panneau d'ajout d'un compte TikTok (Module 8) — déclenché par /dashboard?add=tiktok.
// Saisie MANUELLE : TikTok n'a pas d'API analytics → on crée le compte, la checklist et les
// règles connaissances, puis on saisit les stats hebdomadaires dans le Tracker.

'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function TikTokAddPanel() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const open = searchParams.get('add') === 'tiktok'

  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [niche, setNiche] = useState('IA business / automatisation')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!open) return null

  function close() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('add')
    router.push(`/dashboard?${params.toString()}`)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setDone(false)
    try {
      const res = await fetch('/api/tiktok/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tiktokHandle: handle, language, niche }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'Erreur')
        return
      }
      setDone(true)
      setBusy(false)
      close()
      router.refresh()
    } catch {
      setError('Erreur réseau.')
      setBusy(false)
    }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: '0.9rem',
    width: '100%',
    fontFamily: 'inherit' as const,
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '0.9rem', borderColor: 'var(--accent-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🎵 Ajouter un compte TikTok</h2>
        <button type="button" className="btn" onClick={close} style={{ fontSize: '0.8rem' }}>✕ Fermer</button>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
        TikTok n&apos;a pas d&apos;API analytics : le suivi est manuel (hebdomadaire, dans l&apos;onglet Tracker). Ajoute le compte, la checklist TikTok et les règles seront créées.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: '0.7rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.7rem' }}>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
            Nom du compte
            <input
              type="text"
              required
              maxLength={80}
              placeholder="ex: IA Business Lab"
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
            Handle TikTok (@)
            <input
              type="text"
              required
              maxLength={24}
              placeholder="ex: iabusinesslab"
              style={inputStyle}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
            Langue
            <select
              style={inputStyle}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
            >
              <option value="en">Anglais (EN)</option>
              <option value="ar">Arabe (AR)</option>
            </select>
          </label>
        </div>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
          Niche (optionnel)
          <input
            type="text"
            maxLength={120}
            style={inputStyle}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </label>

        {error && <span style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>{error}</span>}
        {done && <span style={{ fontSize: '0.82rem', color: 'var(--success)' }}>✅ Compte TikTok ajouté.</span>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Ajout…' : '+ Ajouter le compte'}
          </button>
        </div>
      </form>
    </section>
  )
}
