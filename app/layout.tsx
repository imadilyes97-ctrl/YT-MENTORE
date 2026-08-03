import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YT Mentor — Assistant chaîne YouTube',
  description: 'Mentor IA pour développer ta chaîne YouTube Finance/IA et la monétiser (pays Tier 1 + arabe).',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
