'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Ledger { id: string; name: string; type: 'supplier' | 'customer' | 'both' }
interface Item { id: string; name: string; default_unit: string }

type SaudaDirection = 'purchase' | 'sale'

interface SaudaRow {
  id: string
  ledger_id: string | null
  item_id: string | null
  party_name: string
  item_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
  date: string
  note: string | null
  direction: SaudaDirection | null
  created_at: string
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** NPR with up to 2 decimals (rates / deal amounts). */
function formatRupees(n: number): string {
  const x = Math.round(n * 100) / 100
  return `रू ${x.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/** Purchase: rate up = bad (red ▲), down = good (green ▼). Sale: reversed. */
function trendForDirection(diff: number, direction: SaudaDirection): { text: string; color: string } {
  if (Math.abs(diff) <= 0.0001) {
    return { text: 'No change since last deal', color: '#475569' }
  }
  const abs = formatRupees(Math.abs(diff))
  const up = diff > 0
  if (direction === 'purchase') {
    if (up) return { text: `▲ ${abs} since last deal`, color: '#F43F5E' }
    return { text: `▼ ${abs} since last deal`, color: '#10B981' }
  }
  if (up) return { text: `▲ ${abs} since last deal`, color: '#10B981' }
  return { text: `▼ ${abs} since last deal`, color: '#F43F5E' }
}

export default function SaudaPage() {
  const router = useRouter()
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [rows, setRows] = useState<SaudaRow[]>([])
  const [loading, setLoading] = useState(true)

  const [ledgerId, setLedgerId] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [rate, setRate] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [direction, setDirection] = useState<SaudaDirection>('purchase')
  const [historyDirection, setHistoryDirection] = useState<SaudaDirection>('purchase')

  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const partyLedgers = useMemo(() => {
    const f = direction === 'purchase'
      ? (l: Ledger) => l.type === 'supplier' || l.type === 'both'
      : (l: Ledger) => l.type === 'customer' || l.type === 'both'
    return ledgers.filter(f).sort((a, b) => a.name.localeCompare(b.name))
  }, [ledgers, direction])

  const selectedItem = items.find(i => i.id === itemId)
  const unit = selectedItem?.default_unit ?? ''

  const qtyN = parseFloat(quantity)
  const rateN = parseFloat(rate)
  const liveAmount = !Number.isNaN(qtyN) && !Number.isNaN(rateN) && qtyN > 0 && rateN >= 0
    ? Math.round(qtyN * rateN * 100) / 100
    : null

  const load = useCallback(async () => {
    const [{ data: l }, { data: i }, { data: s }] = await Promise.all([
      supabase.from('ledgers').select('id, name, type').order('name'),
      supabase.from('items').select('id, name, default_unit').order('name'),
      supabase.from('sauda').select('*').order('created_at', { ascending: false }),
    ])
    setLedgers((l as Ledger[]) ?? [])
    setItems((i as Item[]) ?? [])
    setRows(
      (s ?? []).map(r => {
        const raw = r as Record<string, unknown>
        const d = raw.direction as SaudaDirection | null | undefined
        return {
          ...r,
          quantity: Number(r.quantity),
          rate: Number(r.rate),
          amount: Number(r.amount),
          direction: d === 'sale' ? 'sale' : 'purchase',
        } as SaudaRow
      }),
    )
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ledgerId || !itemId) {
      toast.error('Choose party and item.')
      return
    }
    const party = partyLedgers.find(l => l.id === ledgerId)
    const item = items.find(i => i.id === itemId)
    if (!party || !item) {
      toast.error('Choose party and item.')
      return
    }
    if (Number.isNaN(qtyN) || qtyN <= 0) {
      toast.error('Enter a valid quantity.')
      return
    }
    if (Number.isNaN(rateN) || rateN < 0) {
      toast.error('Enter a valid rate.')
      return
    }
    const amt = liveAmount ?? qtyN * rateN
    setSubmitting(true)
    try {
      const { error } = await supabase.from('sauda').insert({
        ledger_id: ledgerId,
        item_id: itemId,
        party_name: party.name,
        item_name: item.name,
        quantity: qtyN,
        unit: item.default_unit,
        rate: rateN,
        amount: amt,
        date,
        note: note.trim() || null,
        direction,
      })
      if (error) throw error
      toast.success('Sauda recorded')
      setQuantity('')
      setRate('')
      setDate(new Date().toISOString().split('T')[0])
      setNote('')
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Failed to record.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('sauda').delete().eq('id', pendingDelete)
      if (error) throw error
      toast.success('Removed.')
      setPendingDelete(null)
      await load()
    } catch {
      toast.error('Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const filteredRows = useMemo(
    () => rows.filter(r => (r.direction ?? 'purchase') === historyDirection),
    [rows, historyDirection],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, SaudaRow[]>()
    for (const r of filteredRows) {
      const k = r.item_name
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const d = b.date.localeCompare(a.date)
        if (d !== 0) return d
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }
    return [...map.entries()].sort((a, b) => {
      const da = a[1][0]?.date ?? ''
      const db = b[1][0]?.date ?? ''
      return db.localeCompare(da)
    })
  }, [filteredRows])

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px',
    background: '#0F1117',
    color: '#F1F5F9',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 16,
    boxSizing: 'border-box',
    outline: 'none',
  }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#94A3B8', display: 'block', marginBottom: 6 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <div style={{
        flexShrink: 0,
        background: '#0F1117',
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10,
      }}>
        <div style={{ padding: '14px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Sauda</h1>
            <button
              type="button"
              onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4,
                display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center',
              }}
            >
              <LogoutIcon />
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 4, fontWeight: 500 }}>Price deal tracker</p>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehavior: 'contain',
        padding: '16px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>

        <form
          onSubmit={handleSubmit}
          style={{
            background: '#1A1D27',
            borderRadius: 16,
            padding: 16,
            border: direction === 'purchase' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(16,185,129,0.2)',
            borderTop: direction === 'purchase' ? '3px solid #F59E0B' : '3px solid #10B981',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              onClick={() => { setDirection('purchase'); setLedgerId('') }}
              style={{
                padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: direction === 'purchase' ? '#F59E0B' : '#1A1D27',
                color: direction === 'purchase' ? '#111827' : '#475569',
                border: direction === 'purchase' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}
            >
              Purchase
            </button>
            <button
              type="button"
              onClick={() => { setDirection('sale'); setLedgerId('') }}
              style={{
                padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: direction === 'sale' ? '#10B981' : '#1A1D27',
                color: direction === 'sale' ? '#FFFFFF' : '#475569',
                border: direction === 'sale' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}
            >
              Sale
            </button>
          </div>
          <div>
            <label style={lbl}>{direction === 'purchase' ? 'Supplier' : 'Customer'}</label>
            <select value={ledgerId} onChange={e => setLedgerId(e.target.value)} style={inp} required>
              <option value="">Select party…</option>
              {partyLedgers.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Item</label>
            <select
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              style={inp}
              required
            >
              <option value="">Select item…</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.default_unit})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                style={inp}
                required
              />
            </div>
            <div>
              <label style={lbl}>Rate (रू / {unit || 'unit'})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="0"
                className="font-mono-numbers"
                style={{ ...inp, fontFamily: 'var(--font-dm-mono)' }}
                required
              />
            </div>
          </div>
          <div>
            <label style={lbl}>Amount</label>
            <p
              className="font-mono-numbers"
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: direction === 'purchase' ? '#F59E0B' : '#10B981',
                margin: 0,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-dm-mono)',
              }}
            >
              {liveAmount != null ? formatRupees(liveAmount) : 'रू —'}
            </p>
          </div>
          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={lbl}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. verbal quote, next load…"
              style={inp}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: submitting ? '#222637' : direction === 'purchase' ? '#F59E0B' : '#10B981',
              color: submitting ? '#475569' : direction === 'purchase' ? '#111827' : '#FFFFFF',
            }}
          >
            {submitting ? 'Saving…' : 'Record Sauda'}
          </button>
        </form>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 14 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 14, padding: '12px 8px' }}>
            No sauda recorded yet. Add your first deal above.
          </p>
        ) : (
          <>
            <div>
              <p style={{ ...lbl, marginBottom: 8 }}>History</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setHistoryDirection('purchase')}
                  style={{
                    padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    background: historyDirection === 'purchase' ? '#F59E0B' : '#1A1D27',
                    color: historyDirection === 'purchase' ? '#111827' : '#475569',
                    border: historyDirection === 'purchase' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    transition: 'all 0.15s',
                  }}
                >
                  Purchase deals
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryDirection('sale')}
                  style={{
                    padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    background: historyDirection === 'sale' ? '#10B981' : '#1A1D27',
                    color: historyDirection === 'sale' ? '#FFFFFF' : '#475569',
                    border: historyDirection === 'sale' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    transition: 'all 0.15s',
                  }}
                >
                  Sale deals
                </button>
              </div>
            </div>
            {grouped.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#475569', fontSize: 14, padding: '8px 8px 4px' }}>
                {historyDirection === 'purchase'
                  ? 'No purchase deals yet. Record one above or switch to Sale deals.'
                  : 'No sale deals yet. Record one above or switch to Purchase deals.'}
              </p>
            ) : (
          grouped.map(([itemName, list]) => {
            const newest = list[0]
            const prev = list[1]
            let trend: { text: string; color: string } | null = null
            if (newest && prev) {
              const diff = newest.rate - prev.rate
              trend = trendForDirection(diff, historyDirection)
            }

            return (
              <div key={itemName}>
                <p style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                  marginTop: 4,
                }}>
                  {itemName.toUpperCase()}
                </p>
                <div style={{
                  background: '#1A1D27',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                }}>
                  {list.map((r, idx) => (
                    <div key={r.id}>
                      {idx > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 14px' }} />}
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', margin: 0 }}>{r.party_name}</p>
                            <p className="font-mono-numbers" style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B', flexShrink: 0, margin: 0 }}>
                              {formatRupees(r.rate)}
                            </p>
                          </div>
                          <p style={{ fontSize: 11, color: '#475569', marginTop: 6, marginBottom: 0 }}>
                            {r.quantity} {r.unit} · {formatShortDate(r.date)}
                          </p>
                          {r.note && (
                            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4, marginBottom: 0 }}>{r.note}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(r.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#374151',
                            padding: 6, display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 36,
                            justifyContent: 'center', flexShrink: 0,
                          }}
                          aria-label="Delete sauda"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {trend && (
                  <p style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: trend.color,
                    marginTop: 10,
                    marginBottom: 0,
                    marginLeft: 2,
                  }}>
                    Price change: {trend.text}
                  </p>
                )}
              </div>
            )
          })
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this sauda?"
        message="This removes the deal record only. Stock and cash are unchanged."
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}
