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
  const isTikTok = channel.platform === 'tiktok'

  return (
    <main style={{ display: 'grid', gap: '1.25rem' }}>
      <section className="card">
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
          Évolution — {channel.name} {isTikTok ? '🎵' : '📺'}
        </h3>
        <StatsChart points={points} />
        {last && (
          <p className="mono" style={{ fontSize: '0.75rem', opacity: 0.6, margin: '0.75rem 0 0' }}>
            {isTikTok ? 'Dernière entrée' : 'Dernière sync'} : {last.date.toISOString().slice(0, 10)} ·{' '}
            {last.subscribers} abonnés ·{' '}
            {isTikTok
              ? `${last.views} vues 30j` +
                (last.creatorRewards != null ? ` · ${last.creatorRewards.toLocaleString('fr')} € Creator Rewards` : '') +
                (last.shopCommissions != null ? ` · ${last.shopCommissions.toLocaleString('fr')} € Shop` : '')
              : `${last.watchHours}h · ${last.views} vues`}
          </p>
        )}
      </section>

      <section className="card">
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
          {isTikTok ? 'Saisie hebdomadaire (manuel)' : 'Entrée manuelle'}
        </h3>
        <TrackerAddForm channelId={channel.id} platform={channel.platform} />
        {isTikTok && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', opacity: 0.6 }}>
            TikTok n&apos;a pas d&apos;API analytics : les stats (abonnés, vues 30j, revenus estimés)
            sont saisies manuellement chaque semaine.
          </p>
        )}
      </section>
    </main>
  )
}
