import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveChannel } from '@/lib/active-channel'
import ChecklistItem from '@/components/checklist-item'

export const metadata = { title: 'Checklist — YT Mentor' }
export const dynamic = 'force-dynamic'

// Page /dashboard/checklist — les 7 étapes de la stratégie de la chaîne active.
export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const { channel: param } = await searchParams
  const { channel } = await getActiveChannel(param)

  if (!channel) redirect('/dashboard')

  const steps = await prisma.checklistStep.findMany({
    where: { channelId: channel.id },
    orderBy: { stepNumber: 'asc' },
  })

  const done = steps.filter((s) => s.status === 'done').length

  return (
    <main style={{ display: 'grid', gap: '1.25rem' }}>
      <section className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Checklist stratégie</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.6 }}>
            {channel.name} · {done}/{steps.length} étapes faites
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: 260 }}>
          <div className="ypp-track">
            <div
              className="ypp-fill"
              style={{
                transform: `scaleX(${steps.length ? done / steps.length : 0})`,
                background: 'var(--accent)',
              }}
            />
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '0.6rem' }}>
        {steps.map((step) => (
          <ChecklistItem
            key={step.id}
            step={{
              id: step.id,
              stepNumber: step.stepNumber,
              title: step.title,
              subtasks: (step.subtasks as string[]) || [],
              status: step.status,
            }}
          />
        ))}
      </section>

      <p style={{ fontSize: '0.78rem', opacity: 0.5, margin: 0 }}>
        Clique sur le cercle pour avancer : à faire → en cours → fait → à faire.
      </p>
    </main>
  )
}
