'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/checklist', label: 'Checklist' },
  { href: '/dashboard/tracker', label: 'Tracker' },
  { href: '/dashboard/ideas', label: 'Idées' },
  { href: '/dashboard/knowledge', label: 'Connaissances' },
  { href: '/dashboard/chat', label: 'Mentor' },
]

// Navigation par onglets du dashboard.
export default function DashboardNav({ channelId }: { channelId?: string }) {
  const pathname = usePathname()
  const qs = channelId ? `?channel=${channelId}` : ''

  return (
    <nav
      style={{
        display: 'flex',
        gap: '0.25rem',
        flexWrap: 'wrap',
        padding: '4px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        marginBottom: '1.5rem',
      }}
    >
      {TABS.map((t) => {
        // Dashboard actif seulement sur l'exacte page racine, pas les sous-pages.
        const active = t.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={`${t.href}${qs}`}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: active ? 600 : 400,
              background: active ? 'var(--surface-2)' : 'transparent',
              color: active ? 'var(--foreground)' : 'var(--foreground)',
              opacity: active ? 1 : 0.65,
              textDecoration: 'none',
              transition: 'background 0.15s ease, opacity 0.15s ease',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
