import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { ensureKnowledgeSeeds } from './seeds'

// Scopes Google demandés : lecture YouTube + Analytics de la chaîne.
const GOOGLE_SCOPES = process.env.YOUTUBE_SCOPES
  || 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    // Seed la base de connaissances au premier login (les 6 entrées globales).
    async signIn({ user }) {
      if (user?.id) await ensureKnowledgeSeeds(user.id).catch(() => {})
      return true
    },
    // Expose l'id utilisateur côté session (nécessaire pour les requêtes serveur).
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
