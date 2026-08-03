// Chat du mentor : historique persistant + accueil automatique (premier message).

'use client'

import { useEffect, useRef, useState } from 'react'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export default function MentorChat({ channelId, channelName }: { channelId: string; channelName: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [welcomeDone, setWelcomeDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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
          // Accueil automatique du mentor.
          const r = await fetch('/api/mentor/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId }),
          })
          const w = await r.json()
          if (!cancelled && w.reply) {
            setMessages((prev) => [
              ...prev,
              {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                content: w.reply,
                createdAt: new Date().toISOString(),
              },
            ])
            setWelcomeDone(true)
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

  // Auto-scroll vers le bas à chaque nouveau message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    // Optimistic : affiche immédiatement le message de l'utilisateur.
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() },
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
          { id: `reply-${Date.now()}`, role: 'assistant', content: d.reply, createdAt: new Date().toISOString() },
        ])
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>🎓 Mentor — {channelName}</h3>
        {loading && <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.5 }}>chargement…</span>}
      </div>

      {/* Zone de messages */}
      <div
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
          <div style={{ alignSelf: 'flex-start', fontSize: '0.85rem', opacity: 0.6 }}>…</div>
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
