import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  preload: false,
})

const dmMono = DM_Mono({
  weight: '500',
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Godam',
  description: 'Godown and trade tracker',
  manifest: '/manifest.json',
  other: {
    'theme-color': '#111827',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmMono.variable}`}
        style={{ background: '#F9FAFB', margin: 0, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}
      >
        <main style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', paddingBottom: 72 }}>
          {children}
        </main>
        <BottomNav />
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
