// Brief du jour : résumé + 1 action prioritaire, généré par le mentor (appel serveur).
// Client-side : on appelle /api/mentor/brief au montage, avec le channelId.
// Affiche un état de chargement (skeleton) puis le contenu ; en cas d'échec LLM, message de repli.

'use client'

import { useEffect, useState } from 'react'

interface BriefData {
  content: string | null
  model: string
  absenceDays?: number
  error?: string
}

export default function ChannelBrief({ channelId }: { channelId: string }) {
  const [data, setData] = useState<BriefData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setData(null)
    fetch(`/api/mentor/brief?channelId=${encodeURIComponent(channelId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [channelId])

  if (loading) {
    return (
      <div className="card" style={{ display: 'grid', gap: '0.6rem' }}>
        <div className="skeleton" style={{ height: 12, width: '55%' }} />
        <div className="skeleton" style={{ height: 12, width: '80%' }} />
        <div className="skeleton" style={{ height: 12, width: '65%' }} />
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📌 Brief du jour</h3>
        {data?.absenceDays ? (
          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>
            ⏳ Absence {data.absenceDays} j — voici ce qui s&apos;est passé
          </span>
        ) : (
          <span className="mono" style={{ fontSize: '0.7rem', opacity: 0.45 }}>
            {data?.model ? `via ${data.model}` : ''}
          </span>
        )}
      </div>
      {data?.error ? (
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--danger)' }}>
          Erreur : {data.error}
        </p>
      ) : data?.content ? (
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6 }}>
          {data.content}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.65 }}>
          Le mentor n&apos;est pas disponible pour l&apos;instant (modèle non configuré).
        </p>
      )}
    </div>
  )
}
