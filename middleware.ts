import { withAuth } from 'next-auth/middleware'

// Protège toutes les routes du dashboard — redirige vers /login si non connecté.
export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: ['/dashboard/:path*', '/api/youtube/:path*', '/api/knowledge/:path*', '/api/mentor/:path*'],
}
