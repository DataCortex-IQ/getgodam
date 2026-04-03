'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatNPR } from '@/lib/format'
import { getInventory } from '@/lib/inventory'
import StockBadge from '@/components/StockBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface Transaction {
  id: string
  type: 'purchase' | 'sale'
  quantity: number
  rate: number
  total_amount: number
  date: string
  invoice_no: string | null
  ledgers: { name: string } | null
  items: { name: string } | null
}

interface InventoryItem {
  item_id: string
  name: string
  unit: string
  qty: number
  cost_value: number
  avg_rate: number
  status: string
}

function SkeletonBlock({ w = '100%', h = 20, radius = 8 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div className="shimmer" style={{
      width: w, height: h, borderRadius: radius,
      background: 'rgba(255,255,255,0.06)',
    }} />
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function load() {
    try {
      const [{ data: txData }, inv] = await Promise.all([
        supabase
          .from('transactions')
          .select(`id, type, quantity, rate, total_amount, date, invoice_no, ledgers (name), items (name)`)
          .order('created_at', { ascending: false }),
        getInventory()
      ])
      setTransactions((txData as unknown as Transaction[]) ?? [])
      setInventory(inv)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', pendingDelete)
      if (error) throw error
      toast.success('Transaction deleted.')
      setPendingDelete(null)
      await load()
    } catch {
      toast.error('Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + t.total_amount, 0)
  const totalSales = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.total_amount, 0)
  const totalStockValue = inventory.reduce((s, i) => s + i.cost_value, 0)
  const margin = totalSales - totalPurchases

  const today = new Date().toLocaleDateString('en-NP', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const sortedInventory = [...inventory].sort((a, b) => {
    const order = { good: 0, low: 1, empty: 2 }
    return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0)
  })

  const visibleTx = showAll ? transactions : transactions.slice(0, 5)

  const statusBorderColor = { good: '#10B981', low: '#FB923C', empty: '#F43F5E' }

  return (
    <div style={{ background: '#0F1117', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 20px', background: '#0F1117' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span className="font-mono-numbers" style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B', letterSpacing: '-0.5px' }}>
            godam
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>{today}</span>
            <button onClick={handleLogout} disabled={loggingOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex', alignItems: 'center', opacity: loggingOut ? 0.4 : 1 }}>
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Hero — Stock Value */}
        <div style={{
          background: 'linear-gradient(135deg, #1A1D27 0%, #222637 100%)',
          borderRadius: 16, padding: '20px',
          border: '1px solid rgba(245,158,11,0.2)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8, fontWeight: 500 }}>Total stock value</p>
          {loading ? (
            <SkeletonBlock h={40} radius={8} />
          ) : (
            <p className="font-mono-numbers" style={{ fontSize: 36, fontWeight: 700, color: '#F59E0B', lineHeight: 1, marginBottom: 8 }}>
              {formatNPR(totalStockValue)}
            </p>
          )}
          {!loading && (
            <p style={{ fontSize: 12, color: '#475569' }}>
              {formatNPR(totalPurchases)} purchased · {formatNPR(totalSales)} in sales
            </p>
          )}
        </div>

        {/* 3 metric chips */}
        <div style={{ display: 'flex', gap: 10 }}>
          {loading ? (
            [1, 2, 3].map(i => <SkeletonBlock key={i} h={72} radius={14} />)
          ) : (
            <>
              <div style={metricChip}>
                <p style={chipLabel}>Margin</p>
                <p className="font-mono-numbers" style={{ ...chipValue, color: margin >= 0 ? '#10B981' : '#F43F5E' }}>
                  {margin >= 0 ? '+' : ''}{formatNPR(margin)}
                </p>
              </div>
              <div style={metricChip}>
                <p style={chipLabel}>Purchases</p>
                <p className="font-mono-numbers" style={{ ...chipValue, color: '#F59E0B' }}>{formatNPR(totalPurchases)}</p>
              </div>
              <div style={metricChip}>
                <p style={chipLabel}>Sales</p>
                <p className="font-mono-numbers" style={{ ...chipValue, color: '#10B981' }}>{formatNPR(totalSales)}</p>
              </div>
            </>
          )}
        </div>

        {/* Godown Stock */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={sectionHeader}>Godown</p>
            <Link href="/godown" style={seeAllLink}>See all →</Link>
          </div>

          {loading ? (
            <div style={listCard}>
              {[1, 2, 3].map((i, idx) => (
                <div key={i}>
                  {idx > 0 && <div style={divider} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SkeletonBlock w={36} h={36} radius={8} />
                      <SkeletonBlock w={80} h={14} />
                    </div>
                    <SkeletonBlock w={40} h={20} />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedInventory.length === 0 ? (
            <EmptyGodown />
          ) : (
            <div style={listCard}>
              {sortedInventory.slice(0, 5).map((item, idx) => {
                const initials = item.name.slice(0, 2).toUpperCase()
                const borderColor = statusBorderColor[item.status as keyof typeof statusBorderColor] ?? '#475569'
                return (
                  <div key={item.item_id}>
                    {idx > 0 && <div style={divider} />}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderLeft: `3px solid ${borderColor}` }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'rgba(245,158,11,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#F59E0B', marginRight: 12, flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>{item.name}</p>
                        <StockBadge status={item.status as 'good' | 'low' | 'empty'} />
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: 8 }}>
                        <p className="font-mono-numbers" style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>{item.qty}</p>
                        <p style={{ fontSize: 11, color: '#475569' }}>{item.unit}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={sectionHeader}>Transactions</p>
            {transactions.length > 5 && (
              <button onClick={() => setShowAll(v => !v)} style={{ ...seeAllLink, background: 'none', border: 'none', cursor: 'pointer' }}>
                {showAll ? 'Show less' : `View all ${transactions.length} →`}
              </button>
            )}
          </div>

          {loading ? (
            <div style={listCard}>
              {[1, 2, 3].map((i, idx) => (
                <div key={i}>
                  {idx > 0 && <div style={divider} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <SkeletonBlock w={120} h={14} />
                    <SkeletonBlock w={80} h={14} />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyTransactions />
          ) : (
            <div style={listCard}>
              {visibleTx.map((tx, idx) => {
                const isPurchase = tx.type === 'purchase'
                const dotColor = isPurchase ? '#F59E0B' : '#10B981'
                const amountColor = isPurchase ? '#F59E0B' : '#10B981'
                const prefix = isPurchase ? '−' : '+'
                return (
                  <div key={tx.id}>
                    {idx > 0 && <div style={divider} />}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>
                          {tx.ledgers?.name ?? '—'}
                        </p>
                        <p style={{ fontSize: 12, color: '#475569' }}>
                          {tx.items?.name ?? '—'} · {tx.quantity} units
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p className="font-mono-numbers" style={{ fontSize: 14, fontWeight: 700, color: amountColor }}>
                          {prefix}{formatNPR(tx.total_amount)}
                        </p>
                        <p style={{ fontSize: 11, color: '#475569' }}>{tx.date}</p>
                      </div>
                      <button
                        onClick={() => setPendingDelete(tx.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this entry?"
        message="This transaction will be permanently removed and cannot be undone."
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

function EmptyGodown() {
  return (
    <div style={{ ...listCard, padding: '32px 20px', textAlign: 'center' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}>
        <path d="M4 20L24 6l20 14v22a2 2 0 01-2 2H6a2 2 0 01-2-2V20z" stroke="#94A3B8" strokeWidth="2" />
        <rect x="16" y="26" width="8" height="18" rx="1" stroke="#94A3B8" strokeWidth="2" />
        <rect x="26" y="26" width="8" height="12" rx="1" stroke="#94A3B8" strokeWidth="2" />
      </svg>
      <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 4 }}>No stock yet</p>
      <Link href="/entry" style={{ fontSize: 13, color: '#F59E0B', textDecoration: 'none' }}>
        Add your first purchase in Entry →
      </Link>
    </div>
  )
}

function EmptyTransactions() {
  return (
    <div style={{ ...listCard, padding: '32px 20px', textAlign: 'center' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}>
        <rect x="8" y="4" width="32" height="40" rx="3" stroke="#94A3B8" strokeWidth="2" />
        <path d="M16 14h16M16 22h16M16 30h10" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 4 }}>No transactions yet</p>
      <Link href="/entry" style={{ fontSize: 13, color: '#F59E0B', textDecoration: 'none' }}>
        Tap Entry to record your first purchase →
      </Link>
    </div>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

const sectionHeader: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#94A3B8',
}

const seeAllLink: React.CSSProperties = {
  fontSize: 12, color: '#F59E0B', textDecoration: 'none', fontWeight: 500,
}

const listCard: React.CSSProperties = {
  background: '#1A1D27',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.07)',
  overflow: 'hidden',
}

const divider: React.CSSProperties = {
  height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px',
}

const metricChip: React.CSSProperties = {
  background: '#1A1D27',
  borderRadius: 14,
  padding: '12px 14px',
  border: '1px solid rgba(255,255,255,0.07)',
  flex: 1, minWidth: 0,
}

const chipLabel: React.CSSProperties = {
  fontSize: 10, color: '#475569', marginBottom: 4, fontWeight: 500,
}

const chipValue: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-all',
}
