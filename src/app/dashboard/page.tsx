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
  vat_pct: number
  total_amount: number
  date: string
  invoice_no: string | null
  note: string | null
  ledger_id: string
  item_id: string
  ledgers: { name: string } | null
  items: { name: string } | null
}

interface InventoryItem {
  item_id: string; name: string; unit: string; qty: number
  cost_value: number; avg_rate: number; status: string
}

function Skeleton({ w = '100%', h = 20, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div className="shimmer" style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.06)' }} />
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
  const [cashBalance, setCashBalance] = useState<number | null>(null)

  async function load() {
    try {
      const [{ data: txData }, inv, { data: cashData }] = await Promise.all([
        supabase.from('transactions')
          .select(`id, type, quantity, rate, vat_pct, total_amount, date, invoice_no, note, ledger_id, item_id, ledgers (name), items (name)`)
          .order('created_at', { ascending: false }),
        getInventory(),
        supabase.from('cash_entries').select('type, amount'),
      ])
      setTransactions((txData as unknown as Transaction[]) ?? [])
      setInventory(inv)
      if (cashData) {
        const opening = cashData.filter(e => e.type === 'opening').reduce((s, e) => s + e.amount, 0)
        const income = cashData.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
        const expense = cashData.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
        setCashBalance(opening + income - expense)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleEdit(tx: Transaction) {
    localStorage.setItem('godam_edit_tx', JSON.stringify({
      id: tx.id, type: tx.type, ledger_id: tx.ledger_id, item_id: tx.item_id,
      qty: String(tx.quantity), rate: String(tx.rate), vat_pct: String(tx.vat_pct),
      invoice_no: tx.invoice_no ?? '', note: tx.note ?? '',
      date: tx.date,
    }))
    router.push('/entry')
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
    } catch { toast.error('Failed to delete.') }
    finally { setDeleting(false) }
  }

  const totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + t.total_amount, 0)
  const totalSales = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.total_amount, 0)
  const totalStockValue = inventory.reduce((s, i) => s + i.cost_value, 0)
  const margin = totalSales - totalPurchases
  const today = new Date().toLocaleDateString('en-NP', { weekday: 'short', day: 'numeric', month: 'short' })
  const sortedInventory = [...inventory].sort((a, b) => {
    const o = { good: 0, low: 1, empty: 2 }
    return (o[a.status as keyof typeof o] ?? 0) - (o[b.status as keyof typeof o] ?? 0)
  })
  const visibleTx = showAll ? transactions : transactions.slice(0, 5)
  const borderColor = { good: '#10B981', low: '#FB923C', empty: '#F43F5E' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* FIXED HEADER */}
      <div style={{
        flexShrink: 0, background: '#0F1117',
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10,
      }}>
        <div style={{ padding: '14px 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-mono-numbers" style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B', letterSpacing: '-0.5px' }}>
              godam
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>{today}</span>
              <button onClick={handleLogout} disabled={loggingOut}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 6, display: 'flex', alignItems: 'center', opacity: loggingOut ? 0.4 : 1, minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
                <LogoutIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehavior: 'contain',
        padding: '16px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #1A1D27 0%, #222637 100%)',
          borderRadius: 16, padding: '20px',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8, fontWeight: 500 }}>Total stock value</p>
          {loading ? <Skeleton h={40} r={8} /> : (
            <p className="font-mono-numbers" style={{ fontSize: 34, fontWeight: 700, color: '#F59E0B', lineHeight: 1, marginBottom: 8 }}>
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
          {loading ? [1, 2, 3].map(i => <Skeleton key={i} h={68} r={14} />) : (
            <>
              <div style={chip}>
                <p style={chipLbl}>Margin</p>
                <p className="font-mono-numbers" style={{ ...chipVal, color: margin >= 0 ? '#10B981' : '#F43F5E' }}>
                  {margin >= 0 ? '+' : ''}{formatNPR(margin)}
                </p>
              </div>
              <div style={chip}>
                <p style={chipLbl}>Purchases</p>
                <p className="font-mono-numbers" style={{ ...chipVal, color: '#F59E0B' }}>{formatNPR(totalPurchases)}</p>
              </div>
              <div style={chip}>
                <p style={chipLbl}>Sales</p>
                <p className="font-mono-numbers" style={{ ...chipVal, color: '#10B981' }}>{formatNPR(totalSales)}</p>
              </div>
            </>
          )}
        </div>

        {/* Cash balance */}
        {!loading && cashBalance !== null && (
          <Link href="/cash" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#1A1D27', borderRadius: 14, padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 4 }}>Cash balance</p>
                <p className="font-mono-numbers" style={{ fontSize: 18, fontWeight: 700, color: cashBalance >= 0 ? '#10B981' : '#F43F5E' }}>
                  {formatNPR(cashBalance)}
                </p>
              </div>
              <span style={{ fontSize: 16, color: '#475569' }}>→</span>
            </div>
          </Link>
        )}

        {/* Godown */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={secHdr}>Godown</p>
            <Link href="/godown" style={seeAll}>See all →</Link>
          </div>
          {loading ? (
            <div style={card}>
              {[1, 2, 3].map((i, idx) => (
                <div key={i}>
                  {idx > 0 && <div style={divider} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Skeleton w={36} h={36} r={8} />
                      <Skeleton w={80} h={13} />
                    </div>
                    <Skeleton w={36} h={20} />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedInventory.length === 0 ? (
            <div style={{ ...card, padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>No stock yet</p>
              <Link href="/entry" style={{ fontSize: 13, color: '#F59E0B', textDecoration: 'none' }}>Add first purchase →</Link>
            </div>
          ) : (
            <div style={card}>
              {sortedInventory.slice(0, 5).map((item, idx) => (
                <div key={item.item_id}>
                  {idx > 0 && <div style={divider} />}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderLeft: `3px solid ${borderColor[item.status as keyof typeof borderColor] ?? '#475569'}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#F59E0B', marginRight: 12, flexShrink: 0 }}>
                      {item.name.slice(0, 2).toUpperCase()}
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
              ))}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={secHdr}>Transactions</p>
            {transactions.length > 5 && (
              <button onClick={() => setShowAll(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#F59E0B', fontWeight: 500, padding: 0 }}>
                {showAll ? 'Show less' : `View all ${transactions.length} →`}
              </button>
            )}
          </div>
          {loading ? (
            <div style={card}>
              {[1, 2, 3].map((i, idx) => (
                <div key={i}>
                  {idx > 0 && <div style={divider} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <Skeleton w={120} h={13} />
                    <Skeleton w={80} h={13} />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ ...card, padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>No transactions yet</p>
              <Link href="/entry" style={{ fontSize: 13, color: '#F59E0B', textDecoration: 'none' }}>Record first entry →</Link>
            </div>
          ) : (
            <div style={card}>
              {visibleTx.map((tx, idx) => {
                const isPurchase = tx.type === 'purchase'
                return (
                  <div key={tx.id}>
                    {idx > 0 && <div style={divider} />}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPurchase ? '#F59E0B' : '#10B981', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>{tx.ledgers?.name ?? '—'}</p>
                        <p style={{ fontSize: 12, color: '#475569' }}>
                          {tx.items?.name ?? '—'}{tx.note ? ` · ${tx.note}` : ''} · {tx.quantity} units
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p className="font-mono-numbers" style={{ fontSize: 13, fontWeight: 700, color: isPurchase ? '#F59E0B' : '#10B981' }}>
                          {isPurchase ? '−' : '+'}{formatNPR(tx.total_amount)}
                        </p>
                        <p style={{ fontSize: 11, color: '#475569' }}>{tx.date}</p>
                      </div>
                      <button onClick={() => handleEdit(tx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 6, display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 44, justifyContent: 'center', flexShrink: 0 }}>
                        <PencilIcon />
                      </button>
                      <button onClick={() => setPendingDelete(tx.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 6, display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 44, justifyContent: 'center', flexShrink: 0 }}>
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

      <ConfirmDialog open={!!pendingDelete} title="Delete this entry?"
        message="This transaction will be permanently removed and cannot be undone."
        onCancel={() => setPendingDelete(null)} onConfirm={handleDelete} loading={deleting} />
    </div>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  )
}

const secHdr: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#94A3B8' }
const seeAll: React.CSSProperties = { fontSize: 12, color: '#F59E0B', textDecoration: 'none', fontWeight: 500 }
const card: React.CSSProperties = { background: '#1A1D27', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }
const divider: React.CSSProperties = { height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }
const chip: React.CSSProperties = { background: '#1A1D27', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)', flex: 1, minWidth: 0 }
const chipLbl: React.CSSProperties = { fontSize: 10, color: '#475569', marginBottom: 4, fontWeight: 500 }
const chipVal: React.CSSProperties = { fontSize: 13, fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-all' }
