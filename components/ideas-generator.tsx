// Générateur d'idées de contenu : choisis un pilier → 5 titres SEO (appel serveur).

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PILLARS = [
  'Automatisation',
  'Business',
  'Outils',
  'Études de cas',
  'Erreurs à éviter',
]

export default function IdeasGenerator({ channelId }: { channelId: string }) {
  const router = useRouter()
  const [pillar, setPillar] = useState(PILLARS[0])
  const [loading, setLoading] = useState(false)
  const [ideas, setIdeas] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    setIdeas(null)
    try {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, pillar }),
      })
      const d = await res.json()
      if (d.ideas) {
        setIdeas(d.ideas)
      } else {
        setError(d.error || 'Le générateur n’a pas répondu.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.9rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
          Pilier
          <select
            value={pillar}
            onChange={(e) => setPillar(e.target.value)}
            style={{
              background: 'var(--surface-2)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: '0.9rem',
              minWidth: 180,
            }}
          >
            {PILLARS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={generate} disabled={loading} style={{ marginTop: 16, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Génération…' : '✨ Générer 5 titres'}
        </button>
      </div>

      {error && <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0 }}>{error}</p>}

      {loading && (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div className="skeleton" style={{ height: 12, width: '70%' }} />
          <div className="skeleton" style={{ height: 12, width: '55%' }} />
          <div className="skeleton" style={{ height: 12, width: '80%' }} />
        </div>
      )}

      {ideas && (
        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.9rem 1rem',
          }}
        >
          {ideas}
        </pre>
      )}
    </div>
  )
}
