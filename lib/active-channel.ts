import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper partagé par toutes les pages du dashboard :
// résout la chaîne active depuis ?channel=... (défaut : la 1re chaîne de l'utilisateur).
export async function getActiveChannel(channelParam?: string | string[] | null) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const channels = await prisma.channel.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  if (channels.length === 0) return { session, channels, channel: null }

  const requestedId = typeof channelParam === 'string' ? channelParam : undefined
  const channel = channels.find((c) => c.id === requestedId) ?? channels[0]
  return { session, channels, channel }
}
