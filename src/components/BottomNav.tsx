'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: '▦' },
  { href: '/entry', label: 'Entry', icon: '＋' },
  { href: '/godown', label: 'Godown', icon: '▤' },
  { href: '/ledger', label: 'Ledger', icon: '◉' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#111827', borderTop: '0.5px solid #374151',
      display: 'flex', zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {tabs.map(tab => {
        const active = path.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '10px 0 8px',
            color: active ? '#F59E0B' : '#6B7280',
            textDecoration: 'none', fontSize: 11, fontWeight: 500,
            minHeight: 56
          }}>
            <span style={{ fontSize: 18, marginBottom: 3 }}>{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
