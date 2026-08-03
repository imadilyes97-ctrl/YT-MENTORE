import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ChannelSelector from '@/components/channel-selector'
import DashboardNav from '@/components/dashboard-nav'

// Layout du dashboard : session requise, sélecteur de chaîne + navigation.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const channels = await prisma.channel.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, language: true },
  })

  // La chaîne active est passée aux onglets pour préserver la sélection.
  const activeChannel = channels[0]
  // Sans chaîne connectée, on n'affiche pas les onglets sous-pages qui requièrent un channelId.
  const noChannels = channels.length === 0

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', color: 'var(--foreground)' }}>
            🎬 YT Mentor
          </Link>
          <ChannelSelector channels={channels} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="/api/youtube/connect" className="btn" style={{ fontSize: '0.85rem' }}>
            ➕ Connecter une chaîne
          </a>
          <a href="/api/auth/signout" className="btn" style={{ fontSize: '0.85rem' }}>
            Déconnexion
          </a>
        </div>
      </header>

      {noChannels ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.05rem', marginBottom: '1.25rem' }}>
            Connecte ta première chaîne YouTube pour commencer.
          </p>
          <a href="/api/youtube/connect" className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 24px' }}>
            ➕ Connecter une chaîne YouTube
          </a>
        </div>
      ) : (
        <>
          <DashboardNav channelId={activeChannel?.id} />
          {children}
        </>
      )}
    </div>
  )
}
