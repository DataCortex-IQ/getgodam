'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  {
    href: '/cash',
    label: 'Cash',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="2"
          fill={active ? 'rgba(245,158,11,0.15)' : 'none'}
          stroke={active ? '#F59E0B' : '#475569'} strokeWidth="1.5" />
        <path d="M2 10h20" stroke={active ? '#F59E0B' : '#475569'} strokeWidth="1.5" />
        <circle cx="17" cy="15" r="1.5" fill={active ? '#F59E0B' : '#475569'} />
      </svg>
    ),
  },
  {
    href: '/sauda',
    label: 'Sauda',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12h3l3-8 4 16 3-8h5"
          stroke={active ? '#F59E0B' : '#475569'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const path = usePathname()
  const [dueSoon, setDueSoon] = useState(0)

  useEffect(() => {
    if (path === '/login') return
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    supabase
      .from('cheques')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('due_date', tomorrow)
      .then(({ count }) => setDueSoon(count ?? 0))
  }, [path])

  if (path === '/login') return null

  return (
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
        const showBadge = tab.href === '/cash' && dueSoon > 0
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
            position: 'relative',
          }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {tab.icon(active)}
              {showBadge && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  background: '#F43F5E', color: 'white',
                  fontSize: 9, fontWeight: 700,
                  borderRadius: 10, padding: '1px 5px',
                  minWidth: 16, textAlign: 'center',
                  lineHeight: '14px',
                }}>
                  {dueSoon}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
