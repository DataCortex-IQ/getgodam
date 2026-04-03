'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LiveCalc from '@/components/LiveCalc'
import { toast } from 'sonner'

interface Ledger {
  id: string
  name: string
  type: string
}

interface Item {
  id: string
  name: string
  default_unit: string
}

const defaultForm = {
  ledger_id: '',
  item_id: '',
  qty: '',
  rate: '',
  vat_pct: '13',
  invoice_no: '',
  date: new Date().toISOString().split('T')[0],
}

export default function EntryPage() {
  const [txType, setTxType] = useState<'purchase' | 'sale'>('purchase')
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState(defaultForm)
  const [unit, setUnit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: ledgerData }, { data: itemData }] = await Promise.all([
        supabase.from('ledgers').select('id, name, type').order('name'),
        supabase.from('items').select('id, name, default_unit').order('name'),
      ])
      setLedgers(ledgerData ?? [])
      setItems(itemData ?? [])
    }
    load()
  }, [])

  const filteredLedgers = ledgers.filter(l =>
    txType === 'purchase'
      ? l.type === 'supplier' || l.type === 'both'
      : l.type === 'customer' || l.type === 'both'
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

    if (!form.ledger_id || !form.item_id) {
      toast.error('Please select a party and an item.')
      return
    }
    if (!qty || qty <= 0 || !rate || rate <= 0) {
      toast.error('Quantity and rate must be greater than 0.')
      return
    }

    const taxable_amount = qty * rate
    const vat_amount = taxable_amount * (vatPct / 100)
    const total_amount = taxable_amount + vat_amount

    setSubmitting(true)
    try {
      const { error } = await supabase.from('transactions').insert({
        type: txType,
        ledger_id: form.ledger_id,
        item_id: form.item_id,
        quantity: qty,
        unit: unit,
        rate,
        vat_pct: vatPct,
        taxable_amount,
        vat_amount,
        total_amount,
        invoice_no: form.invoice_no || null,
        date: form.date,
      })

      if (error) throw error

      toast.success(`${txType === 'purchase' ? 'Purchase' : 'Sale'} recorded successfully!`)
      setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] })
      setUnit('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const qty = parseFloat(form.qty) || 0
  const rate = parseFloat(form.rate) || 0
  const vatPct = parseFloat(form.vat_pct) || 0

  return (
    <div>
      {/* Header */}
      <div style={{
        background: '#111827',
        padding: '52px 20px 20px',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
          New Entry
        </h1>
        <p style={{ color: '#6B7280', fontSize: 13 }}>Record a purchase or sale</p>
      </div>

      <div style={{ padding: 16 }}>
        {/* Purchase / Sale Toggle */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 20
        }}>
          {(['purchase', 'sale'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setTxType(t)
                setForm(f => ({ ...f, ledger_id: '' }))
              }}
              style={{
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                background: txType === t ? '#111827' : 'transparent',
                color: txType === t ? (t === 'purchase' ? '#F59E0B' : '#34D399') : '#6B7280',
                transition: 'all 0.15s'
              }}
            >
              {t === 'purchase' ? '↓ Purchase' : '↑ Sale'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Party */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              {txType === 'purchase' ? 'Supplier' : 'Customer'}
            </label>
            <select
              value={form.ledger_id}
              onChange={e => setForm(f => ({ ...f, ledger_id: e.target.value }))}
              style={selectStyle}
              required
            >
              <option value="">Select party…</option>
              {filteredLedgers.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Item */}
          <div>
            <label style={labelStyle}>Item</label>
            <select
              value={form.item_id}
              onChange={e => handleItemChange(e.target.value)}
              style={selectStyle}
              required
            >
              <option value="">Select item…</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Qty + Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                placeholder="0"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Unit</label>
              <div style={{
                ...inputStyle,
                background: '#F9FAFB',
                color: '#6B7280',
                minWidth: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
              }}>
                {unit || '—'}
              </div>
            </div>
          </div>

          {/* Rate */}
          <div>
            <label style={labelStyle}>Rate (₨ per unit)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.rate}
              onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
              placeholder="0.00"
              style={inputStyle}
              required
            />
          </div>

          {/* VAT % */}
          <div>
            <label style={labelStyle}>VAT %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={form.vat_pct}
              onChange={e => setForm(f => ({ ...f, vat_pct: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>

          {/* Invoice No (optional) */}
          <div>
            <label style={labelStyle}>Invoice No (optional)</label>
            <input
              type="text"
              value={form.invoice_no}
              onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))}
              placeholder="e.g. INV-001"
              style={inputStyle}
            />
          </div>

          {/* Live Calc */}
          {(qty > 0 || rate > 0) && (
            <LiveCalc qty={qty} rate={rate} vatPct={vatPct} />
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: txType === 'purchase' ? '#F59E0B' : '#059669',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '14px 0',
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {submitting ? 'Saving…' : `Save ${txType === 'purchase' ? 'Purchase' : 'Sale'}`}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 15,
  color: '#111827',
  background: '#FFFFFF',
  boxSizing: 'border-box',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
}
