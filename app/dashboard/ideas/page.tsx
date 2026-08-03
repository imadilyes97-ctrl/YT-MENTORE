import { redirect } from 'next/navigation'
import { getActiveChannel } from '@/lib/active-channel'
import IdeasGenerator from '@/components/ideas-generator'

export const metadata = { title: 'Idées — YT Mentor' }
export const dynamic = 'force-dynamic'

// Page /dashboard/ideas — générateur de titres SEO par pilier.
export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const { channel: param } = await searchParams
  const { channel } = await getActiveChannel(param)
  if (!channel) redirect('/dashboard')

  return (
    <main style={{ display: 'grid', gap: '1.25rem' }}>
      <section className="card" style={{ display: 'grid', gap: '0.3rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Générateur d&apos;idées</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>
          Choisis un pilier — le mentor propose 5 titres optimisés SEO pour la cible de{' '}
          {channel.name} ({channel.language === 'ar' ? 'Golfe/diaspora' : 'Tier 1'}).
        </p>
      </section>
      <IdeasGenerator channelId={channel.id} />
    </main>
  )
}
