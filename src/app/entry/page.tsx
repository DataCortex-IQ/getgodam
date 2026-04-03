'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LiveCalc from '@/components/LiveCalc'
import { toast } from 'sonner'

interface Ledger { id: string; name: string; type: string }
interface Item { id: string; name: string; default_unit: string }

const defaultForm = {
  ledger_id: '', item_id: '', qty: '', rate: '',
  vat_pct: '13', invoice_no: '',
  date: new Date().toISOString().split('T')[0],
}

export default function EntryPage() {
  const router = useRouter()
  const [txType, setTxType] = useState<'purchase' | 'sale'>('purchase')
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState(defaultForm)
  const [unit, setUnit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: l }, { data: i }] = await Promise.all([
        supabase.from('ledgers').select('id, name, type').order('name'),
        supabase.from('items').select('id, name, default_unit').order('name'),
      ])
      setLedgers(l ?? [])
      setItems(i ?? [])
    }
    load()
  }, [])

  const filteredLedgers = ledgers.filter(l =>
    txType === 'purchase' ? l.type === 'supplier' || l.type === 'both' : l.type === 'customer' || l.type === 'both'
  )

  function handleItemChange(itemId: string) {
    const item = items.find(i => i.id === itemId)
    setForm(f => ({ ...f, item_id: itemId }))
    setUnit(item?.default_unit ?? '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseFloat(form.qty)
    const rate = parseFloat(form.rate)
    const vatPct = parseFloat(form.vat_pct)
    if (!form.ledger_id || !form.item_id) { toast.error('Select a party and item.'); return }
    if (!qty || qty <= 0 || !rate || rate <= 0) { toast.error('Qty and rate must be > 0.'); return }
    const taxable_amount = qty * rate
    const vat_amount = taxable_amount * (vatPct / 100)
    const total_amount = taxable_amount + vat_amount
    setSubmitting(true)
    try {
      const { error } = await supabase.from('transactions').insert({
        type: txType, ledger_id: form.ledger_id, item_id: form.item_id,
        quantity: qty, unit, rate, vat_pct: vatPct,
        taxable_amount, vat_amount, total_amount,
        invoice_no: form.invoice_no || null, date: form.date,
      })
      if (error) throw error
      toast.success(`${txType === 'purchase' ? 'Purchase' : 'Sale'} recorded!`)
      setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] })
      setUnit('')
    } catch { toast.error('Failed to save.') }
    finally { setSubmitting(false) }
  }

  const qty = parseFloat(form.qty) || 0
  const rate = parseFloat(form.rate) || 0
  const vatPct = parseFloat(form.vat_pct) || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* FIXED HEADER — title + toggle */}
      <div style={{
        flexShrink: 0, background: '#0F1117',
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10,
      }}>
        <div style={{ padding: '14px 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>New Entry</h1>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
              <LogoutIcon />
            </button>
          </div>
          {/* Purchase / Sale toggle — always visible */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => { setTxType('purchase'); setForm(f => ({ ...f, ledger_id: '' })) }}
              style={{
                padding: '11px 0', borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: txType === 'purchase' ? '#F59E0B' : '#1A1D27',
                color: txType === 'purchase' ? '#111827' : '#475569',
                border: txType === 'purchase' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}
            >
              ↓ Purchase
            </button>
            <button
              onClick={() => { setTxType('sale'); setForm(f => ({ ...f, ledger_id: '' })) }}
              style={{
                padding: '11px 0', borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: txType === 'sale' ? '#10B981' : '#1A1D27',
                color: txType === 'sale' ? '#FFFFFF' : '#475569',
                border: txType === 'sale' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}
            >
              ↑ Sale
            </button>
          </div>
        </div>
      </div>

      {/* SCROLLABLE FORM */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehavior: 'contain',
        padding: '16px 16px 24px',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={lbl}>{txType === 'purchase' ? 'Supplier' : 'Customer'}</label>
            <select value={form.ledger_id} onChange={e => setForm(f => ({ ...f, ledger_id: e.target.value }))} style={sel} required>
              <option value="">Select party…</option>
              {filteredLedgers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Item</label>
            <select value={form.item_id} onChange={e => handleItemChange(e.target.value)} style={sel} required>
              <option value="">Select item…</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.default_unit})</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div>
              <label style={lbl}>Quantity</label>
              <input type="number" min="0" step="any" value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                placeholder="0" style={inp} required />
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <div style={{ ...inp, background: '#1A1D27', color: unit ? '#F1F5F9' : '#475569', minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                {unit || '—'}
              </div>
            </div>
          </div>

          <div>
            <label style={lbl}>Rate (रू per unit)</label>
            <input type="number" min="0" step="any" value={form.rate}
              onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
              placeholder="0.00" style={inp} required />
          </div>

          <div>
            <label style={lbl}>VAT %</label>
            <input type="number" min="0" max="100" step="any" value={form.vat_pct}
              onChange={e => setForm(f => ({ ...f, vat_pct: e.target.value }))} style={inp} />
          </div>

          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} required />
          </div>

          <div>
            <label style={lbl}>Invoice No (optional)</label>
            <input type="text" value={form.invoice_no}
              onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))}
              placeholder="e.g. INV-001" style={inp} />
          </div>

          {qty > 0 && rate > 0 && (
            <div className="fade-in">
              <LiveCalc qty={qty} rate={rate} vatPct={vatPct} />
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            background: submitting ? '#222637' : txType === 'purchase' ? '#F59E0B' : '#10B981',
            color: submitting ? '#475569' : txType === 'purchase' ? '#111827' : '#FFFFFF',
            opacity: submitting ? 0.8 : 1, transition: 'all 0.15s',
          }}>
            {submitting ? 'Saving…' : `Save ${txType === 'purchase' ? 'Purchase' : 'Sale'}`}
          </button>
        </form>
      </div>
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

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#94A3B8', display: 'block', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#0F1117', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 16, boxSizing: 'border-box', outline: 'none' }
const sel: React.CSSProperties = { ...inp, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }
