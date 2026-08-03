import { redirect } from 'next/navigation'
import { getActiveChannel } from '@/lib/active-channel'
import MentorChat from '@/components/mentor-chat'

export const metadata = { title: 'Mentor — YT Mentor' }
export const dynamic = 'force-dynamic'

// Page /dashboard/chat — conversation avec le mentor IA de la chaîne active.
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const { channel: param } = await searchParams
  const { channel } = await getActiveChannel(param)
  if (!channel) redirect('/dashboard')

  return (
    <main>
      <MentorChat channelId={channel.id} channelName={channel.name} />
    </main>
  )
}
