// Élément de checklist interactif : cycle todo → in_progress → done → todo.
// L'état est re-rendu côté serveur (mutation en base, pas de store local).

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'todo' | 'in_progress' | 'done'

interface Step {
  id: string
  stepNumber: number
  title: string
  subtasks: string[]
  status: Status
}

const STATUS_LABEL: Record<Status, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Fait',
}

const STATUS_COLOR: Record<Status, string> = {
  todo: 'var(--border)',
  in_progress: 'var(--warning)',
  done: 'var(--success)',
}

export default function ChecklistItem({ step }: { step: Step }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/checklist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: step.id }),
      })
      if (!res.ok) throw new Error('Échec de la mise à jour')
      router.refresh() // re-render serveur avec le nouveau statut
    } catch {
      setError("Échec de la mise à jour — réessaie.")
    } finally {
      setBusy(false)
    }
  }

  const done = step.status === 'done'

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        gap: '0.9rem',
        alignItems: 'flex-start',
        padding: '1rem 1.1rem',
        opacity: done ? 0.72 : 1,
      }}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={done}
        aria-label={`${done ? 'Marquer à faire' : 'Changer le statut'} : ${step.title}`}
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          marginTop: 2,
          borderRadius: '50%',
          border: `2px solid ${STATUS_COLOR[step.status]}`,
          background: done ? 'var(--success)' : 'transparent',
          cursor: busy ? 'wait' : 'pointer',
          transition: 'background 0.15s ease',
          outlineOffset: 2,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.5 }}>#{step.stepNumber}</span>
          <strong style={{ fontSize: '0.95rem' }}>{step.title}</strong>
          <span
            className="mono"
            style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 999, background: 'var(--surface-2)', border: `1px solid ${STATUS_COLOR[step.status]}`, color: STATUS_COLOR[step.status] }}
          >
            {STATUS_LABEL[step.status]}
          </span>
        </div>
        {step.subtasks.length > 0 && (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', display: 'grid', gap: '0.2rem' }}>
            {step.subtasks.map((s, i) => (
              <li key={`${s}-${i}`} style={{ fontSize: '0.85rem', opacity: 0.75 }}>
                {s}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
