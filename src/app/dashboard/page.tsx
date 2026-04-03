'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatNPR } from '@/lib/format'
import { getInventory } from '@/lib/inventory'
import MetricCard from '@/components/MetricCard'
import StockBadge from '@/components/StockBadge'
import TransactionBadge from '@/components/TransactionBadge'
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

export default function DashboardPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function load() {
    try {
      const [{ data: txData }, inv] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            id, type, quantity, rate, total_amount, date, invoice_no,
            ledgers (name),
            items (name)
          `)
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

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', pendingDelete)
      if (error) throw error
      toast.success('Transaction deleted.')
      setPendingDelete(null)
      await load()
    } catch {
      toast.error('Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const totalPurchases = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.total_amount, 0)

  const totalSales = transactions
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.total_amount, 0)

  const totalStockValue = inventory.reduce((sum, i) => sum + i.cost_value, 0)
  const margin = totalSales - totalPurchases

  const today = new Date().toLocaleDateString('en-NP', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })

  const sortedInventory = [...inventory].sort((a, b) => {
    const order = { good: 0, low: 1, empty: 2 }
    return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0)
  })

  const visibleTx = showAll ? transactions : transactions.slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div style={{
        background: '#111827',
        padding: '52px 20px 20px',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-mono-numbers" style={{
            fontSize: 24, fontWeight: 700, color: '#F59E0B', letterSpacing: '-0.5px'
          }}>
            godam
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{today}</span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Logout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6B7280', padding: 4, display: 'flex', alignItems: 'center',
                opacity: loggingOut ? 0.5 : 1,
              }}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>
          {loading ? 'Loading…' : `${transactions.length} transactions recorded`}
        </p>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Metric cards 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <MetricCard label="Stock Value" value={formatNPR(totalStockValue)} accent />
          <MetricCard label="Margin" value={formatNPR(margin)} sub={margin >= 0 ? 'Profit' : 'Loss'} />
          <MetricCard label="Total Purchases" value={formatNPR(totalPurchases)} />
          <MetricCard label="Total Sales" value={formatNPR(totalSales)} />
        </div>

        {/* Godown Stock */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Godown Stock
          </p>
          {loading ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Loading…</p>
          ) : sortedInventory.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>No inventory yet. Add a purchase to get started.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedInventory.map(item => (
                <div key={item.item_id} style={{
                  background: '#FFFFFF', borderRadius: 10,
                  padding: '12px 14px', border: '1px solid #E5E7EB',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{item.name}</p>
                    <StockBadge status={item.status as 'good' | 'low' | 'empty'} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="font-mono-numbers" style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                      {item.qty}
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF' }}>{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {showAll ? 'All Transactions' : 'Recent Transactions'}
            </p>
            {transactions.length > 5 && (
              <button
                onClick={() => setShowAll(v => !v)}
                style={{ fontSize: 12, color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                {showAll ? 'Show less' : `View all ${transactions.length}`}
              </button>
            )}
          </div>

          {loading ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Loading…</p>
          ) : transactions.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>No transactions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleTx.map(tx => (
                <div key={tx.id} style={{
                  background: '#FFFFFF', borderRadius: 10,
                  padding: '12px 14px', border: '1px solid #E5E7EB',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 1 }}>
                        {tx.ledgers?.name ?? '—'}
                      </p>
                      <p style={{ fontSize: 12, color: '#6B7280' }}>
                        {tx.items?.name ?? '—'} · {tx.quantity} units
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginLeft: 8 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p className="font-mono-numbers" style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                          {formatNPR(tx.total_amount)}
                        </p>
                        <TransactionBadge type={tx.type} />
                      </div>
                      <button
                        onClick={() => setPendingDelete(tx.id)}
                        title="Delete transaction"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px 4px', color: '#D1D5DB', lineHeight: 1,
                          fontSize: 16, marginTop: 1,
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#9CA3AF' }}>{tx.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this entry?"
        message="This transaction will be permanently removed. This cannot be undone."
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
