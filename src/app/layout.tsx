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
    'theme-color': '#0F1117',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Godam',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body
        className={`${dmSans.variable} ${dmMono.variable}`}
        style={{
          background: '#0F1117',
          margin: 0,
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          overscrollBehavior: 'none',
          height: '100dvh',
          overflow: 'hidden',
          position: 'fixed',
          width: '100%',
        }}
      >
        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {children}
          <BottomNav />
        </div>
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  )
}
