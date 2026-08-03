import { YPP_TIERS } from '@/lib/alerts'

// Deux barres de progression YPP (Palier 1 puis Palier 2) pour une chaîne.
// Le remplissage utilise transform:scaleX (compositor-friendly, cf. globals.css).
export default function YppBars({
  subscribers,
  watchHours,
}: {
  subscribers: number
  watchHours: number
}) {
  const tiers = [YPP_TIERS.tier1, YPP_TIERS.tier2]
  const labels = ['Palier 1', 'Palier 2']

  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      {tiers.map((tier, i) => {
        const subPct = Math.min(100, Math.round((subscribers / tier.subscribers) * 100))
        const hoursPct = Math.min(100, Math.round((watchHours / tier.watchHours) * 100))
        const reached = subscribers >= tier.subscribers && watchHours >= tier.watchHours

        return (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '0.35rem',
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', opacity: 0.75 }}>
                {labels[i]} YPP
              </span>
              {reached && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)' }}>
                  ✅ ATTEINT
                </span>
              )}
            </div>

            {/* Abonnés */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, auto) 1fr 44px', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.65 }}>
                {subscribers.toLocaleString('fr')} / {tier.subscribers}
              </span>
              <div
                className="ypp-track"
                role="progressbar"
                aria-valuenow={subPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Abonnés ${subscribers.toLocaleString('fr')}/${tier.subscribers} (${subPct}%)`}
              >
                <div
                  className="ypp-fill"
                  style={{
                    transform: `scaleX(${subPct / 100})`,
                    background: subPct >= 100 ? 'var(--success)' : 'var(--accent)',
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: '0.72rem', textAlign: 'right', opacity: 0.75 }}>
                {subPct}%
              </span>
            </div>

            {/* Heures de visionnage */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, auto) 1fr 44px', gap: '0.5rem', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '0.72rem', opacity: 0.65 }}>
                {watchHours.toLocaleString('fr')}h / {tier.watchHours.toLocaleString('fr')}h
              </span>
              <div
                className="ypp-track"
                role="progressbar"
                aria-valuenow={hoursPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Heures ${watchHours.toLocaleString('fr')}h/${tier.watchHours.toLocaleString('fr')}h (${hoursPct}%)`}
              >
                <div
                  className="ypp-fill"
                  style={{
                    transform: `scaleX(${hoursPct / 100})`,
                    background: hoursPct >= 100 ? 'var(--success)' : 'var(--accent-2)',
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: '0.72rem', textAlign: 'right', opacity: 0.75 }}>
                {hoursPct}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
