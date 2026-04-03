'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/ConfirmDialog'

const tabs = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          fill={active ? '#F59E0B' : 'none'}
          stroke={active ? '#F59E0B' : '#475569'}
          strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" stroke={active ? '#111827' : '#475569'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/entry',
    label: 'Entry',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9"
          fill={active ? '#F59E0B' : 'none'}
          stroke={active ? '#F59E0B' : '#475569'}
          strokeWidth="1.5" />
        <path d="M12 8v8M8 12h8" stroke={active ? '#111827' : '#475569'} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/godown',
    label: 'Godown',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M2 11l10-7 10 7v10a1 1 0 01-1 1H3a1 1 0 01-1-1V11z"
          fill={active ? 'rgba(245,158,11,0.15)' : 'none'}
          stroke={active ? '#F59E0B' : '#475569'} strokeWidth="1.5" />
        <rect x="7" y="13" width="4" height="8" rx="1"
          fill={active ? '#F59E0B' : 'none'}
          stroke={active ? '#F59E0B' : '#475569'} strokeWidth="1.5" />
        <rect x="13" y="13" width="4" height="5" rx="1"
          stroke={active ? '#F59E0B' : '#475569'} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/ledger',
    label: 'Ledger',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3"
          fill={active ? 'rgba(245,158,11,0.15)' : 'none'}
          stroke={active ? '#F59E0B' : '#475569'} strokeWidth="1.5" />
        <path d="M7 8h10M7 12h10M7 16h6"
          stroke={active ? '#F59E0B' : '#475569'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const path = usePathname()
  const router = useRouter()
  const [showLogout, setShowLogout] = useState(false)

  if (path === '/login') return null

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      <nav style={{
        background: '#1A1D27',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }}>
        {tabs.map(tab => {
          const active = path.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 0 8px',
              color: active ? '#F59E0B' : '#475569',
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              gap: 4,
              minHeight: 56,
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}>
              {tab.icon(active)}
              <span>{tab.label}</span>
            </Link>
          )
        })}

        {/* Logout button */}
        <button
          onClick={() => setShowLogout(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0 8px',
            color: '#475569',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 400,
            gap: 4,
            minHeight: 56,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <polyline points="16 17 21 12 16 7"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="21" y1="12" x2="9" y2="12"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Logout</span>
        </button>
      </nav>

      <ConfirmDialog
        open={showLogout}
        title="Log out?"
        message="You'll need to enter your password to get back in."
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  )
}
