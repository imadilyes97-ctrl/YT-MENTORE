import { prisma } from '@/lib/prisma'
import { getActiveChannel } from '@/lib/active-channel'
import { redirect } from 'next/navigation'
import KnowledgeAddForm from '@/components/knowledge-add-form'
import KnowledgeArchiveButton from '@/components/knowledge-archive-button'

export const metadata = { title: 'Connaissances — YT Mentor' }
export const dynamic = 'force-dynamic'

// Page /dashboard/knowledge — base de connaissances évolutive (globale + par chaîne).
export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const { channel: param } = await searchParams
  const { session, channels, channel } = await getActiveChannel(param)

  if (!channel) redirect('/dashboard')

  // Entrées actives : globales + spécifiques à la chaîne active.
  const entries = await prisma.knowledgeEntry.findMany({
    where: {
      userId: session.user.id,
      status: 'active',
      OR: [{ channelId: null }, { channelId: channel.id }],
    },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  })

  // Icône/badge de plateforme par chaîne (📺 YouTube / 🎵 TikTok — Module 8).
  const platformById = new Map(channels.map((c) => [c.id, c.platform]))

  // Regroupe par catégorie.
  const byCat = new Map<string, typeof entries>()
  for (const e of entries) {
    const list = byCat.get(e.category) ?? []
    list.push(e)
    byCat.set(e.category, list)
  }

  const channelNameById = new Map(channels.map((c) => [c.id, c.name]))

  return (
    <main style={{ display: 'grid', gap: '1.25rem' }}>
      <section className="card" style={{ display: 'grid', gap: '0.3rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Base de connaissances</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>
          Les règles ici alimentent les conseils du mentor. Globale ou liée à une chaîne.
        </p>
      </section>

      <KnowledgeAddForm channelId={channel.id} channelName={channel.name} />

      {entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', opacity: 0.7, padding: '2rem' }}>
          Aucune connaissance active. Ajoute ta première règle ci-dessus.
        </div>
      ) : (
        [...byCat.entries()].map(([cat, list]) => (
          <section key={cat} style={{ display: 'grid', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6 }}>
              {cat}
            </h3>
            {list.map((e) => (
              <div key={e.id} className="card" style={{ padding: '0.9rem 1rem', display: 'grid', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{e.title}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {e.channelId && (
                      <span className="mono" style={{ fontSize: '0.68rem', opacity: 0.6 }}>
                        {platformById.get(e.channelId) === 'tiktok' ? '🎵' : '📺'}{' '}
                        {channelNameById.get(e.channelId) ?? 'Chaîne'}
                      </span>
                    )}
                    <KnowledgeArchiveButton entryId={e.id} />
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.86rem', opacity: 0.8, whiteSpace: 'pre-wrap' }}>{e.content}</p>
              </div>
            ))}
          </section>
        ))
      )}
    </main>
  )
}
