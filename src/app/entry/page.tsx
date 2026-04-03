'use client'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LiveCalc, { type LiveCalcLine } from '@/components/LiveCalc'
import { toast } from 'sonner'

interface Ledger { id: string; name: string; type: string }
interface Item { id: string; name: string; default_unit: string }
type PaymentMethod = 'cash' | 'cheque' | 'credit'

type ItemRow = { key: string; item_id: string; qty: string; rate: string; unit: string }

function newItemRow(): ItemRow {
  return {
    key: globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    item_id: '', qty: '', rate: '', unit: '',
  }
}

const defaultForm = {
  ledger_id: '',
  vat_pct: '13', invoice_no: '', note: '',
  date: new Date().toISOString().split('T')[0],
  cheque_number: '', bank_name: '', cheque_due_date: new Date().toISOString().split('T')[0],
}

export default function EntryPage() {
  const router = useRouter()
  const [txType, setTxType] = useState<'purchase' | 'sale'>('purchase')
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState(defaultForm)
  const [itemRows, setItemRows] = useState<ItemRow[]>(() => [newItemRow()])
  const [submitting, setSubmitting] = useState(false)
  const [editTxId, setEditTxId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: l }, { data: i }] = await Promise.all([
        supabase.from('ledgers').select('id, name, type').order('name'),
        supabase.from('items').select('id, name, default_unit').order('name'),
      ])
      setLedgers(l ?? [])
      setItems(i ?? [])

      const raw = localStorage.getItem('godam_edit_tx')
      if (raw) {
        try {
          const tx = JSON.parse(raw)
          localStorage.removeItem('godam_edit_tx')
          setEditTxId(tx.id)
          setTxType(tx.type)
          setPaymentMethod(tx.payment_method ?? 'cash')
          setForm({
            ledger_id: tx.ledger_id,
            vat_pct: tx.vat_pct,
            invoice_no: tx.invoice_no ?? '', note: tx.note ?? '', date: tx.date,
            cheque_number: '', bank_name: '', cheque_due_date: new Date().toISOString().split('T')[0],
          })
          const foundItem = (i ?? []).find((item: Item) => item.id === tx.item_id)
          setItemRows([{
            ...newItemRow(),
            item_id: tx.item_id,
            qty: tx.qty,
            rate: tx.rate,
            unit: foundItem?.default_unit ?? '',
          }])
        } catch { localStorage.removeItem('godam_edit_tx') }
      }
    }
    load()
  }, [])

  const filteredLedgers = ledgers.filter(l =>
    txType === 'purchase' ? l.type === 'supplier' || l.type === 'both' : l.type === 'customer' || l.type === 'both'
  )

  const selectedParty = ledgers.find(l => l.id === form.ledger_id)

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { data, error } = await supabase.storage.from('cheques').upload(filename, file)
      if (error) throw error
      setPhotoPath(data.path)
      toast.success('Photo uploaded!')
    } catch { toast.error('Photo upload failed.') }
    finally { setUploadingPhoto(false) }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.ledger_id) { toast.error('Select a party.'); return }
    const vatPctNum = parseFloat(form.vat_pct) || 0

    for (const row of itemRows) {
      if (!row.item_id) { toast.error('Select an item for each line.'); return }
      const q = parseFloat(row.qty)
      const r = parseFloat(row.rate)
      if (!q || q <= 0 || !r || r <= 0) { toast.error('Qty and rate required for each item.'); return }
    }
    if (paymentMethod === 'cheque' && !form.cheque_due_date) { toast.error('Enter cheque due date.'); return }

    let grandTotal = 0
    const lineTotals: { taxable: number; vat: number; total: number }[] = []
    for (const row of itemRows) {
      const qty = parseFloat(row.qty)
      const rate = parseFloat(row.rate)
      const taxable_amount = qty * rate
      const vat_amount = taxable_amount * vatPctNum / 100
      const total_amount = taxable_amount + vat_amount
      lineTotals.push({ taxable: taxable_amount, vat: vat_amount, total: total_amount })
      grandTotal += total_amount
    }

    setSubmitting(true)
    try {
      if (editTxId) {
        const { error: delErr } = await supabase.from('transactions').delete().eq('id', editTxId)
        if (delErr) throw delErr
      }

      const partyName = selectedParty?.name ?? 'Unknown'
      const insertedIds: string[] = []

      for (let i = 0; i < itemRows.length; i++) {
        const row = itemRows[i]
        const qty = parseFloat(row.qty)
        const rate = parseFloat(row.rate)
        const { taxable_amount, vat_amount, total_amount } = {
          taxable_amount: lineTotals[i].taxable,
          vat_amount: lineTotals[i].vat,
          total_amount: lineTotals[i].total,
        }

        const { data: txData, error: txErr } = await supabase.from('transactions').insert({
          type: txType,
          ledger_id: form.ledger_id,
          item_id: row.item_id,
          quantity: qty,
          unit: row.unit,
          rate,
          vat_pct: vatPctNum,
          taxable_amount,
          vat_amount,
          total_amount,
          invoice_no: form.invoice_no || null,
          note: form.note || null,
          date: form.date,
          payment_method: paymentMethod,
        }).select().single()
        if (txErr) throw txErr
        insertedIds.push(txData.id)
      }

      if (paymentMethod === 'cheque' && insertedIds.length > 0) {
        const { data: chequeData, error: chequeErr } = await supabase.from('cheques').insert({
          direction: txType === 'sale' ? 'incoming' : 'outgoing',
          transaction_id: insertedIds[0],
          party_name: partyName,
          amount: grandTotal,
          cheque_number: form.cheque_number || null,
          bank_name: form.bank_name || null,
          due_date: form.cheque_due_date,
          status: 'pending',
          photo_url: photoPath,
        }).select().single()
        if (chequeErr) throw chequeErr
        if (chequeData) {
          await supabase.from('transactions').update({ cheque_id: chequeData.id }).in('id', insertedIds)
        }
      }

      toast.success(
        editTxId
          ? 'Entry updated!'
          : itemRows.length > 1
            ? `${itemRows.length} items recorded!`
            : `${txType === 'purchase' ? 'Purchase' : 'Sale'} recorded!`
      )
      setEditTxId(null)
      setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] })
      setItemRows([newItemRow()])
      setPaymentMethod('cash')
      setPhotoPath(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save.')
    }
    finally { setSubmitting(false) }
  }

  const vatPct = parseFloat(form.vat_pct) || 0
  const liveLines: LiveCalcLine[] = itemRows
    .filter(r => parseFloat(r.qty) > 0 && parseFloat(r.rate) > 0)
    .map(r => {
      const qty = parseFloat(r.qty)
      const rate = parseFloat(r.rate)
      const taxable = qty * rate
      const vat = taxable * vatPct / 100
      const name = items.find(i => i.id === r.item_id)?.name ?? 'Item'
      return { name, taxable, vat, total: taxable + vat }
    })
  const grandTaxable = liveLines.reduce((s, l) => s + l.taxable, 0)
  const grandVat = liveLines.reduce((s, l) => s + l.vat, 0)
  const grandTotal = liveLines.reduce((s, l) => s + l.total, 0)
  const hasCalcValues = liveLines.length > 0

  const canAddRows = !editTxId

  function resetFormAndRows() {
    setEditTxId(null)
    setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] })
    setItemRows([newItemRow()])
    setPaymentMethod('cash')
    setPhotoPath(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" onClick={() => { setTxType('purchase'); setForm(f => ({ ...f, ledger_id: '' })); setItemRows([newItemRow()]) }}
              style={{ padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: txType === 'purchase' ? '#F59E0B' : '#1A1D27', color: txType === 'purchase' ? '#111827' : '#475569', border: txType === 'purchase' ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>
              ↓ Purchase
            </button>
            <button type="button" onClick={() => { setTxType('sale'); setForm(f => ({ ...f, ledger_id: '' })); setItemRows([newItemRow()]) }}
              style={{ padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: txType === 'sale' ? '#10B981' : '#1A1D27', color: txType === 'sale' ? '#FFFFFF' : '#475569', border: txType === 'sale' ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>
              ↑ Sale
            </button>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehavior: 'contain',
        padding: '16px 16px 24px',
      }}>
        {editTxId && (
          <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>✏ Editing existing entry — save to update</span>
            <button type="button" onClick={resetFormAndRows}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#94A3B8', padding: '4px 8px', fontWeight: 500 }}>
              Cancel edit
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={lbl}>{txType === 'purchase' ? 'Supplier' : 'Customer'}</label>
            <select value={form.ledger_id} onChange={e => setForm(f => ({ ...f, ledger_id: e.target.value }))} style={sel} required>
              <option value="">Select party…</option>
              {filteredLedgers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Items</label>
            {itemRows.map((row, index) => (
              <div key={row.key} style={{
                background: '#0F1117',
                borderRadius: 12,
                padding: '12px',
                paddingTop: itemRows.length > 1 ? 36 : 12,
                border: '1px solid rgba(255,255,255,0.07)',
                marginBottom: 8,
                position: 'relative',
              }}>
                {itemRows.length > 1 && canAddRows && (
                  <button
                    type="button"
                    onClick={() => setItemRows(rows => rows.filter((_, i) => i !== index))}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(244,63,94,0.15)',
                      border: 'none', borderRadius: 6,
                      color: '#F43F5E', fontSize: 11,
                      padding: '4px 10px', cursor: 'pointer',
                      fontWeight: 600,
                      minHeight: 28,
                    }}
                  >
                    Remove
                  </button>
                )}
                <label style={lbl}>{itemRows.length > 1 ? `Item #${index + 1}` : 'Item'}</label>
                <select
                  value={row.item_id}
                  onChange={e => {
                    const item = items.find(i => i.id === e.target.value)
                    setItemRows(rows => rows.map((r, i) =>
                      i === index ? { ...r, item_id: e.target.value, unit: item?.default_unit ?? '' } : r
                    ))
                  }}
                  style={{ ...sel, marginBottom: 8 }}
                  required
                >
                  <option value="">Select item…</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.default_unit})</option>
                  ))}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>Qty ({row.unit || '—'})</label>
                    <input
                      type="number" min="0" step="any"
                      value={row.qty}
                      onChange={e => setItemRows(rows => rows.map((r, i) =>
                        i === index ? { ...r, qty: e.target.value } : r
                      ))}
                      placeholder="0"
                      style={inp}
                      required
                    />
                  </div>
                  <div>
                    <label style={lbl}>Rate (रू)</label>
                    <input
                      type="number" min="0" step="any"
                      value={row.rate}
                      onChange={e => setItemRows(rows => rows.map((r, i) =>
                        i === index ? { ...r, rate: e.target.value } : r
                      ))}
                      placeholder="0.00"
                      style={inp}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            {canAddRows && (
              <button
                type="button"
                onClick={() => setItemRows(rows => [...rows, newItemRow()])}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: 'transparent',
                  border: '1px dashed rgba(245,158,11,0.4)',
                  borderRadius: 12,
                  color: '#F59E0B',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 8,
                  minHeight: 44,
                }}
              >
                + Add another item
              </button>
            )}
          </div>

          <div>
            <label style={lbl}>VAT %</label>
            <input type="number" min="0" max="100" step="any" value={form.vat_pct}
              onChange={e => setForm(f => ({ ...f, vat_pct: e.target.value }))} style={inp} />
          </div>

          <div>
            <label style={lbl}>Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {(['cash', 'cheque', 'credit'] as PaymentMethod[]).map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  style={{
                    padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    background: paymentMethod === m ? (m === 'cash' ? '#10B981' : m === 'cheque' ? '#F59E0B' : '#64748B') : '#1A1D27',
                    color: paymentMethod === m ? (m === 'cheque' ? '#111827' : '#FFFFFF') : '#475569',
                    border: paymentMethod === m ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  {m === 'cash' ? '💵 Cash' : m === 'cheque' ? '🏦 Cheque' : '📋 Credit'}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cheque' && (
            <div className="fade-in" style={{ background: '#1A1D27', borderRadius: 12, padding: '14px', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
                {txType === 'sale' ? '📥 Incoming cheque (to deposit)' : '📤 Outgoing cheque (to pay)'}
              </p>
              <div>
                <label style={lbl}>Due Date *</label>
                <input type="date" value={form.cheque_due_date}
                  onChange={e => setForm(f => ({ ...f, cheque_due_date: e.target.value }))}
                  style={inp} required />
              </div>
              <div>
                <label style={lbl}>Cheque No (optional)</label>
                <input type="text" value={form.cheque_number}
                  onChange={e => setForm(f => ({ ...f, cheque_number: e.target.value }))}
                  placeholder="e.g. 001234" style={inp} />
              </div>
              <div>
                <label style={lbl}>Bank Name (optional)</label>
                <input type="text" value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder="e.g. NMB Bank, NIC Asia…" style={inp} />
              </div>
              <div>
                <label style={lbl}>Cheque Photo (optional)</label>
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 14px', background: '#0F1117', color: photoPath ? '#10B981' : '#475569',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', fontSize: 14,
                }}>
                  {uploadingPhoto ? '⏳ Uploading…' : photoPath ? '✓ Photo attached' : '📷 Take / Choose photo'}
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload}
                    style={{ display: 'none' }} disabled={uploadingPhoto} />
                </label>
              </div>
            </div>
          )}

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

          <div>
            <label style={lbl}>Brand / Note (optional)</label>
            <input type="text" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Nutriplus, Fortune, local brand…" style={inp} />
          </div>

          {hasCalcValues && (
            <div className="fade-in">
              <LiveCalc
                vatPct={vatPct}
                lines={liveLines}
                grandTaxable={grandTaxable}
                grandVat={grandVat}
                grandTotal={grandTotal}
              />
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            background: submitting ? '#222637' : txType === 'purchase' ? '#F59E0B' : '#10B981',
            color: submitting ? '#475569' : txType === 'purchase' ? '#111827' : '#FFFFFF',
            opacity: submitting ? 0.8 : 1, transition: 'all 0.15s',
          }}>
            {submitting ? 'Saving…' : editTxId
              ? 'Save update'
              : itemRows.length > 1
                ? `Save ${itemRows.length} items`
                : `Save ${txType === 'purchase' ? 'Purchase' : 'Sale'}`}
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
