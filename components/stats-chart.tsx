'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Graphique d'évolution (recharts) des stats d'une chaîne : abonnés, vues, heures.
// Area Chart "Pulse" — gradient discret, grille pointillée, axes mono.
// Reçoit les TrackerEntry déjà triées par date croissante.

interface Point {
  date: string
  label: string
  subscribers: number
  watchHours: number
  views: number
}

const AXIS_TICK = { fill: 'oklch(0.45 0.01 260)', fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as Point
  return (
    <div
      style={{
        background: 'oklch(0.1 0 0 / 0.92)',
        border: '1px solid var(--accent)',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: '0.78rem',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      }}
    >
      <div style={{ opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div>👤 {p.subscribers.toLocaleString('fr')} abonnés</div>
      <div>📺 {p.views.toLocaleString('fr')} vues</div>
      <div>⏱ {p.watchHours.toLocaleString('fr')}h visionnage</div>
    </div>
  )
}

export default function StatsChart({ points }: { points: Point[] }) {
  if (points.length === 0) return null

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pulse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.22 260)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="oklch(0.65 0.22 260)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="oklch(0.18 0.01 260)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={42} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="subscribers"
            name="Abonnés"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#pulse)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
