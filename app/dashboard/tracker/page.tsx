import { prisma } from '@/lib/prisma'
import { getActiveChannel } from '@/lib/active-channel'
import { redirect } from 'next/navigation'
import StatsChart from '@/components/stats-chart'
import TrackerAddForm from '@/components/tracker-add-form'

export const metadata = { title: 'Tracker — YT Mentor' }
export const dynamic = 'force-dynamic'

// Page /dashboard/tracker — évolution des stats + entrée manuelle + alerte %Tier1.
export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const { channel: param } = await searchParams
  const { channel } = await getActiveChannel(param)
  if (!channel) redirect('/dashboard')

  const entries = await prisma.trackerEntry.findMany({
    where: { channelId: channel.id },
    orderBy: { date: 'asc' },
  })

  const points = entries.map((e) => ({
    date: e.date.toISOString(),
    label: e.date.toISOString().slice(5, 10),
    subscribers: e.subscribers,
    watchHours: e.watchHours,
    views: e.views,
  }))

  // Dernière entrée pour la ligne de lecture.
  const last = entries[entries.length - 1]

  return (
    <main style={{ display: 'grid', gap: '1.25rem' }}>
      <section className="card">
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Évolution — {channel.name}</h3>
        <StatsChart points={points} />
        {last && (
          <p className="mono" style={{ fontSize: '0.75rem', opacity: 0.6, margin: '0.75rem 0 0' }}>
            Dernière sync : {last.date.toISOString().slice(0, 10)} · {last.subscribers} abonnés ·{' '}
            {last.watchHours}h · {last.views} vues
          </p>
        )}
      </section>

      <section className="card">
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Entrée manuelle</h3>
        <TrackerAddForm channelId={channel.id} />
      </section>
    </main>
  )
}
