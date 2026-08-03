'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface ChannelOption {
  id: string
  name: string
  language: 'en' | 'ar'
  platform: 'youtube' | 'tiktok'
}

// Icône de plateforme : 📺 YouTube / 🎵 TikTok.
function platformIcon(platform: ChannelOption['platform']) {
  return platform === 'tiktok' ? '🎵' : '📺'
}

// Sélecteur de chaîne — l'état vit dans l'URL (?channel=...), pas dans un store.
// Module 8 : affiche tous les Channel (YouTube ET TikTok) avec leur icône de plateforme.
export default function ChannelSelector({ channels }: { channels: ChannelOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('channel') || channels[0]?.id || ''

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (id && id !== channels[0]?.id) {
      params.set('channel', id)
    } else {
      params.delete('channel') // la 1re chaîne est le défaut, URL propre
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  if (channels.length === 0) return null
  if (channels.length === 1) {
    return (
      <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>
        {platformIcon(channels[0].platform)} {channels[0].name}
      </span>
    )
  }

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>Chaîne :</span>
      <select
        value={active}
        onChange={(e) => select(e.target.value)}
        style={{
          background: 'var(--surface-2)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: '0.9rem',
        }}
      >
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            {platformIcon(c.platform)} {c.name} ({c.language === 'ar' ? 'عربية' : 'EN'})
          </option>
        ))}
      </select>
    </label>
  )
}
