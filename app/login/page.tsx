import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignInButton from './sign-in-button'

export const metadata = { title: 'Connexion — YT Mentor' }

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(1200px 600px at 50% -10%, rgba(108,92,231,0.18), transparent), var(--background)',
        padding: '2rem',
      }}
    >
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 56, height: 56, margin: '0 auto 1rem',
              borderRadius: 14, display: 'grid', placeItems: 'center',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              fontSize: '1.75rem', boxShadow: '0 8px 24px rgba(108,92,231,0.35)',
            }}
          >
            🎬
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>YT Mentor</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--foreground)', opacity: 0.7, fontSize: '0.95rem' }}>
            Développe ta chaîne YouTube Finance/IA avec un mentor IA.
          </p>
        </div>

        <SignInButton />

        <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--foreground)', opacity: 0.6, textAlign: 'center', lineHeight: 1.5 }}>
          Connexion avec ton compte Google.<br />
          Scopes demandés : YouTube lecture + Analytics (données privées de ta chaîne uniquement).
        </div>
      </div>
    </main>
  )
}
