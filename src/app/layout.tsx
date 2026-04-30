import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AutoCheck — Analysez votre annonce avant d\'acheter',
  description:
    'AutoCheck analyse les annonces de véhicules d\'occasion et vous donne un score objectif, les dépenses à prévoir, et une recommandation d\'achat.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  )
}
