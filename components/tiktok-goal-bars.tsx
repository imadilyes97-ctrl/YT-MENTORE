import { TIKTOK_TIERS } from '@/lib/alerts'

// Barres d'objectifs TikTok (Module 8) :
// 1) TikTok Shop Affiliate (1000-5000 abonnés — objectif court terme)
// 2) Creator Rewards Program (10K abonnés + 100K vues/30j — objectif moyen terme)
// Réordonnées selon les VRAIS seuils d'atteinte (Shop avant Creator Rewards).
export default function TikTokGoalBars({
  subscribers,
  views,
  shopCommissions,
}: {
  subscribers: number
  views: number
  shopCommissions: number | null
}) {
  const { shopAffiliate, creatorRewards } = TIKTOK_TIERS

  // Shop Affiliate : objectif court terme (entrée dans la fourchette 1000-5000).
  const shopPct = Math.min(100, Math.round((subscribers / shopAffiliate.minSubscribers) * 100))
  const shopReached = subscribers >= shopAffiliate.minSubscribers

  // Creator Rewards : deux barres (abonnés + vues 30j).
  const crSubPct = Math.min(100, Math.round((subscribers / creatorRewards.subscribers) * 100))
  const crViewsPct = Math.min(100, Math.round((views / creatorRewards.views30d) * 100))
  const crReached = subscribers >= creatorRewards.subscribers && views >= creatorRewards.views30d

  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      {/* 1 — TikTok Shop Affiliate (court terme) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', opacity: 0.75 }}>
            🛍️ TikTok Shop Affiliate
          </span>
          {shopReached && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)' }}>
              ✅ ATTEINT
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, auto) 1fr 44px', gap: '0.5rem', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.65 }}>
            {subscribers.toLocaleString('fr')} / {shopAffiliate.minSubscribers}
          </span>
          <div
            className="ypp-track"
            role="progressbar"
            aria-valuenow={shopPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Abonnés ${subscribers.toLocaleString('fr')}/${shopAffiliate.minSubscribers} (${shopPct}%)`}
          >
            <div
              className="ypp-fill"
              style={{
                transform: `scaleX(${shopPct / 100})`,
                background: shopReached ? 'var(--success)' : 'var(--accent)',
              }}
            />
          </div>
          <span className="mono" style={{ fontSize: '0.72rem', textAlign: 'right', opacity: 0.75 }}>
            {shopPct}%
          </span>
        </div>
        {shopCommissions != null && (
          <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '0.3rem' }}>
            💰 Commissions estimées : {shopCommissions.toLocaleString('fr')} €
          </div>
        )}
      </div>

      {/* 2 — Creator Rewards Program (moyen terme) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', opacity: 0.75 }}>
            🎉 Creator Rewards Program
          </span>
          {crReached && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)' }}>
              ✅ ATTEINT
            </span>
          )}
        </div>

        {/* Abonnés */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, auto) 1fr 44px', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.65 }}>
            {subscribers.toLocaleString('fr')} / {creatorRewards.subscribers.toLocaleString('en')}
          </span>
          <div
            className="ypp-track"
            role="progressbar"
            aria-valuenow={crSubPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Abonnés ${subscribers.toLocaleString('fr')}/${creatorRewards.subscribers.toLocaleString('en')} (${crSubPct}%)`}
          >
            <div
              className="ypp-fill"
              style={{
                transform: `scaleX(${crSubPct / 100})`,
                background: crSubPct >= 100 ? 'var(--success)' : 'var(--accent)',
              }}
            />
          </div>
          <span className="mono" style={{ fontSize: '0.72rem', textAlign: 'right', opacity: 0.75 }}>
            {crSubPct}%
          </span>
        </div>

        {/* Vues 30 jours */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, auto) 1fr 44px', gap: '0.5rem', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.65 }}>
            {views.toLocaleString('fr')} / {creatorRewards.views30d.toLocaleString('en')}
          </span>
          <div
            className="ypp-track"
            role="progressbar"
            aria-valuenow={crViewsPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Vues 30j ${views.toLocaleString('fr')}/${creatorRewards.views30d.toLocaleString('en')} (${crViewsPct}%)`}
          >
            <div
              className="ypp-fill"
              style={{
                transform: `scaleX(${crViewsPct / 100})`,
                background: crViewsPct >= 100 ? 'var(--success)' : 'var(--accent-2)',
              }}
            />
          </div>
          <span className="mono" style={{ fontSize: '0.72rem', textAlign: 'right', opacity: 0.75 }}>
            {crViewsPct}%
          </span>
        </div>
      </div>
    </div>
  )
}
