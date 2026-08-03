// Chat du mentor : historique persistant + accueil automatique (premier message).

'use client'

import { useEffect, useRef, useState } from 'react'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export default function MentorChat({
  channelId,
  channelName,
  platform = 'youtube',
}: {
  channelId: string
  channelName: string
  platform?: 'youtube' | 'tiktok'
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  const firstRender = useRef(true)

  // IDs uniques (pas de collision de keys avec Date.now() seul — fix review GLM-5.2-Design).
  const uid = (p: string) => `${p}-${Date.now()}-${idRef.current++}`

  // Charge l'historique puis génère l'accueil automatique si vide.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/mentor/chat?channelId=${encodeURIComponent(channelId)}`)
        const d = await res.json()
        if (cancelled) return
        const list: Msg[] = (d.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        }))
        setMessages(list)
        if (list.length === 0) {
          // Accueil automatique du mentor (le serveur le persiste → pas de doublon au re-mount).
          const r = await fetch('/api/mentor/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId }),
          })
          const w = await r.json()
          if (!cancelled && w.reply) {
            setMessages([
              {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                content: w.reply,
                createdAt: new Date().toISOString(),
              },
            ])
          }
        }
      } catch {
        /* silencieux : l'UI affiche l'état vide */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [channelId])

  // Auto-scroll du conteneur (pas de la page) + skip au premier mount
  // (fix review GLM-5.2-Design : ne pas scroller la page entière au chargement).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const container = bottomRef.current?.parentElement
    if (container) container.scrollTop = container.scrollHeight
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setError('')
    // Optimistic : affiche immédiatement le message de l'utilisateur.
    setMessages((prev) => [
      ...prev,
      { id: uid('tmp'), role: 'user', content: text, createdAt: new Date().toISOString() },
    ])
    try {
      const res = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, message: text }),
      })
      const d = await res.json()
      if (d.reply) {
        setMessages((prev) => [
          ...prev,
          { id: uid('reply'), role: 'assistant', content: d.reply, createdAt: new Date().toISOString() },
        ])
      } else {
        setError(d.error || 'Le mentor n’a pas pu répondre.')
      }
    } catch {
      setError('Échec réseau — réessaie.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
          🎓 Mentor — {platform === 'tiktok' ? '🎵' : '📺'} {channelName}
        </h3>
        {loading && <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.5 }}>chargement…</span>}
      </div>

      {/* Zone de messages (aria-live pour les lecteurs d'écran — fix review GLM-5.2-Design) */}
      <div
        role="log"
        aria-live="polite"
        aria-busy={sending}
        style={{
          display: 'grid',
          gap: '0.6rem',
          maxHeight: 420,
          overflowY: 'auto',
          padding: '0.25rem',
        }}
      >
        {messages.length === 0 && !loading && (
          <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>Aucun message. Écris pour démarrer.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
              color: m.role === 'user' ? '#fff' : 'var(--foreground)',
              borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
              padding: '0.6rem 0.85rem',
              fontSize: '0.9rem',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', fontSize: '0.85rem', opacity: 0.6 }} aria-label="Envoi en cours">…</div>
        )}
        {error && (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger)' }}>{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        style={{ display: 'flex', gap: '0.5rem' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pose une question sur ${channelName}…`}
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: '0.9rem',
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()} style={{ opacity: sending || !input.trim() ? 0.6 : 1 }}>
          Envoyer
        </button>
      </form>
    </div>
  )
}
