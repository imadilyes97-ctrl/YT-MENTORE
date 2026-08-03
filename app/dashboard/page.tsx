import { prisma } from '@/lib/prisma'
import { getActiveChannel } from '@/lib/active-channel'
import { YPP_TIERS, TIKTOK_TIERS } from '@/lib/alerts'
import YppBars from '@/components/ypp-bars'
import TikTokGoalBars from '@/components/tiktok-goal-bars'
import StatsChart from '@/components/stats-chart'
import ChannelBrief from '@/components/channel-brief'
import TikTokAddPanel from '@/components/tiktok-add-panel'

export const metadata = { title: 'Dashboard — YT Mentor' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const { channel } = await searchParams
  const { session, channels, channel: active } = await getActiveChannel(channel)

  // Pas de chaîne connectée → état vide avec les 2 CTA (YouTube + TikTok).
  if (!active) {
    return (
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <TikTokAddPanel />
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            Aucune chaîne connectée pour l&apos;instant.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/api/youtube/connect" className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 24px' }}>
              ➕ Connecter une chaîne YouTube
            </a>
            <a href="/dashboard?add=tiktok" className="btn" style={{ fontSize: '1rem', padding: '12px 24px' }}>
              🎵 Ajouter un compte TikTok
            </a>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>
            Le mentor suit tes stats et te guide vers le YPP (YouTube) ou le Creator Rewards (TikTok).
          </p>
        </div>
      </main>
    )
  }

  // Marque la visite (suivi d'inactivité utilisateur pour le résumé d'absence).
  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastVisitAt: new Date() },
  }).catch(() => {})

  const [entries, alerts, checklist] = await Promise.all([
    prisma.trackerEntry.findMany({
      where: { channelId: active.id },
      orderBy: { date: 'asc' },
      take: 60,
    }),
    prisma.alert.findMany({
      where: { channelId: active.id, resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.checklistStep.findMany({
      where: { channelId: active.id },
      orderBy: { stepNumber: 'asc' },
    }),
  ])

  const last = entries[entries.length - 1]
  const points = entries.map((e) => ({
    date: e.date.toISOString(),
    label: e.date.toISOString().slice(5, 10),
    subscribers: e.subscribers,
    watchHours: e.watchHours,
    views: e.views,
  }))

  const doneSteps = checklist.filter((c) => c.status === 'done').length
  const topCountries = (last?.topCountries as { country: string; views: number }[] | null) ?? []

  const isTikTok = active.platform === 'tiktok'

  return (
    <main style={{ display: 'grid', gap: '1.25rem' }}>
      <TikTokAddPanel />
      <ChannelBrief channelId={active.id} />

      {/* Hero stats — adaptées à la plateforme */}
      {isTikTok ? (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <span className="label">Abonnés</span>
            <div className="stat-value" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              {last ? last.subscribers.toLocaleString('fr') : '—'}
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              objectif {TIKTOK_TIERS.creatorRewards.subscribers.toLocaleString('fr')}
            </span>
          </div>
          <div className="card">
            <span className="label">Vues 30 j</span>
            <div className="stat-value" style={{ color: 'var(--accent-2)', fontVariantNumeric: 'tabular-nums' }}>
              {last ? last.views.toLocaleString('fr') : '—'}
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              / {TIKTOK_TIERS.creatorRewards.views30d.toLocaleString('fr')}
            </span>
          </div>
          <div className="card">
            <span className="label">Creator Rewards</span>
            <div className="stat-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {last && last.creatorRewards != null ? `${last.creatorRewards.toLocaleString('fr')} €` : '—'}
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              estimé / semaine
            </span>
          </div>
          <div className="card">
            <span className="label">TikTok Shop</span>
            <div className="stat-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {last && last.shopCommissions != null ? `${last.shopCommissions.toLocaleString('fr')} €` : '—'}
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              commissions estimées
            </span>
          </div>
        </section>
      ) : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <span className="label">Abonnés</span>
            <div className="stat-value" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              {last ? last.subscribers.toLocaleString('fr') : '—'}
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              objectif {YPP_TIERS.tier2.subscribers.toLocaleString('fr')}
            </span>
          </div>
          <div className="card">
            <span className="label">Heures 12 mois</span>
            <div className="stat-value" style={{ color: 'var(--accent-2)', fontVariantNumeric: 'tabular-nums' }}>
              {last ? last.watchHours.toLocaleString('fr') : '—'}
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              h / objectif {YPP_TIERS.tier2.watchHours.toLocaleString('fr')}h
            </span>
          </div>
          <div className="card">
            <span className="label">Vues</span>
            <div className="stat-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {last ? last.views.toLocaleString('fr') : '—'}
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              {last ? `${last.videoCount} vidéo(s)` : ''}
            </span>
          </div>
          <div className="card">
            <span className="label">Checklist</span>
            <div className="stat-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {doneSteps}
              <span style={{ fontSize: '1rem', opacity: 0.45 }}>/{checklist.length}</span>
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.55 }}>
              étapes stratégie
            </span>
          </div>
        </section>
      )}

      {/* Barres d'objectifs + top pays (TikTok : Creator Rewards au lieu de YPP) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.95rem' }}>
            {isTikTok ? 'Progression Creator Rewards' : 'Progression YPP'}
          </h3>
          {isTikTok ? (
            <TikTokGoalBars
              subscribers={last?.subscribers ?? 0}
              views={last?.views ?? 0}
              shopCommissions={last?.shopCommissions ?? null}
            />
          ) : (
            <YppBars subscribers={last?.subscribers ?? 0} watchHours={last?.watchHours ?? 0} />
          )}
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.95rem' }}>
            {isTikTok ? 'Revenus estimés' : 'Top pays (12 mois)'}
          </h3>
          {isTikTok ? (
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.85rem' }}>Creator Rewards</span>
                <span className="mono" style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                  {last && last.creatorRewards != null ? `${last.creatorRewards.toLocaleString('fr')} €` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.85rem' }}>TikTok Shop Affiliate</span>
                <span className="mono" style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                  {last && last.shopCommissions != null ? `${last.shopCommissions.toLocaleString('fr')} €` : '—'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', opacity: 0.55, margin: 0 }}>
                Saisie hebdomadaire manuelle dans l&apos;onglet Tracker.
              </p>
            </div>
          ) : topCountries.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {topCountries.slice(0, 6).map((c) => (
                <div key={c.country} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <span className="mono" style={{ fontSize: '0.85rem' }}>{c.country}</span>
                  <span className="mono" style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                    {c.views.toLocaleString('fr')} vues
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>Pas encore de données.</p>
          )}
        </div>
      </section>

      {/* Graphique évolution */}
      <section className="card">
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Évolution des abonnés</h3>
        <StatsChart points={points} />
      </section>

      {/* Alertes */}
      <section className="card">
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Alertes actives</h3>
        {alerts.length === 0 ? (
          <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>✅ Aucune alerte active.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {alerts.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>{a.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
