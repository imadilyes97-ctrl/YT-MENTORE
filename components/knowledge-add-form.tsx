// Formulaire d'ajout de connaissance : texte brut → résumé LLM + catégorie + gestion de conflit.
// Flux : POST /api/knowledge/add → si conflict, affiche les choix (garder/remplacer/garder les deux) → resolve-conflict.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Conflict {
  id: string
  title: string
  category: string
}
interface Proposed {
  title: string
  category: string
  content: string
  channelId?: string | null
}

export default function KnowledgeAddForm({
  channelId,
  channelName,
}: {
  channelId: string | null
  channelName: string
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [scope, setScope] = useState<'global' | 'channel'>('global')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState<{ conflicts: Conflict[]; proposed: Proposed } | null>(null)
  const [done, setDone] = useState(false)

  async function add() {
    if (busy || !text.trim()) return
    setBusy(true)
    setError('')
    setConflict(null)
    setDone(false)
    try {
      const res = await fetch('/api/knowledge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, channelId: scope === 'channel' ? channelId : null }),
      })
      const d = await res.json()
      if (d.conflict) {
        setConflict(d)
      } else if (d.success) {
        setText('')
        setDone(true)
        router.refresh()
      } else {
        setError(d.error || 'Erreur')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setBusy(false)
    }
  }

  async function resolve(action: 'keep_both' | 'replace', targetId?: string) {
    if (!conflict) return
    setBusy(true)
    try {
      await fetch('/api/knowledge/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetId, entry: conflict.proposed }),
      })
      setConflict(null)
      setText('')
      setDone(true)
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
    padding: '10px 12px',
    fontSize: '0.9rem',
    width: '100%',
    fontFamily: 'inherit',
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.8rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', opacity: 0.75 }}>
          Portée
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'global' | 'channel')}
            style={inputStyle}
          >
            <option value="global">🌍 Globale (toutes chaînes)</option>
            {channelId && <option value="channel">📺 {channelName}</option>}
          </select>
        </label>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Colle un texte brut (règle, extrait, note)… Le mentor le résume en 3-5 points et le classe par catégorie."
        rows={5}
        style={inputStyle}
      />

      {error && <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0 }}>{error}</p>}
      {done && <p style={{ fontSize: '0.85rem', color: 'var(--success)', margin: 0 }}>✅ Connaissance enregistrée.</p>}

      {conflict ? (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            ⚠️ Conflit détecté avec {conflict.conflicts.length} entrée(s) existante(s) :
          </p>
          {conflict.conflicts.map((c) => (
            <div key={c.id} style={{ fontSize: '0.85rem', opacity: 0.8, borderLeft: '2px solid var(--border)', paddingLeft: '0.6rem' }}>
              <strong>{c.title}</strong> · <span className="mono">{c.category}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => resolve('keep_both')} disabled={busy}>
              Garder les deux
            </button>
            {conflict.conflicts[0] && (
              <button className="btn btn-danger" onClick={() => resolve('replace', conflict.conflicts[0].id)} disabled={busy}>
                Remplacer
              </button>
            )}
            <button className="btn" onClick={() => setConflict(null)} disabled={busy}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={add} disabled={busy || !text.trim()} style={{ opacity: busy || !text.trim() ? 0.6 : 1 }}>
            {busy ? 'Analyse…' : '+ Ajouter'}
          </button>
        </div>
      )}
    </div>
  )
}
