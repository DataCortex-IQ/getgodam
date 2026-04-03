'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatNPR } from '@/lib/format'
import { computeCashBalance, isLegacyTransactionCashMirror } from '@/lib/cashBalance'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'

interface CashEntry {
  id: string
  type: 'opening' | 'income' | 'expense'
  amount: number
  note: string
  date: string
  created_at: string
  category?: string | null
}

interface PettyCashRow {
  id: string
  party_name: string | null
  item: string | null
  quantity: number | null
  rate: number | null
  amount: number
  purpose: string
  note: string | null
  date: string
  cash_entry_id: string
  created_at: string
}

interface CashTransactionRow {
  id: string
  type: 'sale' | 'purchase'
  total_amount: number
  date: string
  created_at: string
  note: string | null
  ledgers: { name: string } | null
  items: { name: string } | null
}

type UnifiedActivityRow =
  | {
    key: string
    source: 'transaction'
    displayType: 'income' | 'expense'
    amount: number
    note: string
    date: string
    sortTs: number
  }
  | {
    key: string
    source: 'manual'
    cashEntryId: string
    displayType: 'income' | 'expense'
    amount: number
    note: string
    date: string
    sortTs: number
  }

interface Cheque {
  id: string
  direction: 'incoming' | 'outgoing'
  party_name: string
  amount: number
  cheque_number: string | null
  bank_name: string | null
  due_date: string
  status: 'pending' | 'deposited' | 'bounced'
  photo_url: string | null
  note: string | null
}

const defaultForm = { amount: '', note: '', date: new Date().toISOString().split('T')[0] }

const defaultPettyForm = {
  purpose: '',
  party_name: '',
  item: '',
  quantity: '',
  rate: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  note: '',
}

function dueDateLabel(dateStr: string): { text: string; color: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, color: '#F43F5E' }
  if (diff === 0) return { text: 'Due today', color: '#F43F5E' }
  if (diff === 1) return { text: 'Due tomorrow', color: '#F59E0B' }
  return { text: `Due ${dateStr}`, color: '#475569' }
}

export default function CashPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'income' | 'expense' | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingOpening, setEditingOpening] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [pendingDeposit, setPendingDeposit] = useState<Cheque | null>(null)
  const [pendingBounce, setPendingBounce] = useState<string | null>(null)
  const [actioning, setActioning] = useState(false)
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [pettyRows, setPettyRows] = useState<PettyCashRow[]>([])
  const [showPettyForm, setShowPettyForm] = useState(false)
  const [pettyForm, setPettyForm] = useState(defaultPettyForm)
  const [pettySubmitting, setPettySubmitting] = useState(false)
  const [pendingPettyDelete, setPendingPettyDelete] = useState<string | null>(null)
  const [deletingPetty, setDeletingPetty] = useState(false)
  const [cashTxRows, setCashTxRows] = useState<CashTransactionRow[]>([])

  async function load() {
    const [{ data: cashData }, { data: chequeData }, { data: pettyData }, { data: cashTxData }] = await Promise.all([
      supabase.from('cash_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('cheques').select('*').order('due_date', { ascending: true }),
      supabase.from('petty_cash').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('transactions')
        .select('id, type, total_amount, date, created_at, note, payment_method, ledgers(name), items(name)')
        .eq('payment_method', 'cash')
        .order('created_at', { ascending: false }),
    ])
    setEntries(cashData ?? [])
    setCheques(chequeData ?? [])
    setPettyRows((pettyData as PettyCashRow[]) ?? [])
    setCashTxRows((cashTxData as unknown as CashTransactionRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = parseFloat(pettyForm.quantity)
    const r = parseFloat(pettyForm.rate)
    if (!Number.isNaN(q) && !Number.isNaN(r) && q > 0 && r > 0) {
      const next = String(Math.round(q * r * 100) / 100)
      setPettyForm(f => (f.amount === next ? f : { ...f, amount: next }))
    }
  }, [pettyForm.quantity, pettyForm.rate])

  const openingEntry = entries.find(e => e.type === 'opening')
  const opening = openingEntry?.amount ?? 0
  const balance = computeCashBalance(entries, cashTxRows)

  const pendingCheques = cheques.filter(c => c.status === 'pending')
  const pendingIncoming = pendingCheques.filter(c => c.direction === 'incoming').reduce((s, c) => s + c.amount, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mode) return
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount.'); return }
    if (!form.note.trim()) { toast.error('Enter a note.'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('cash_entries').insert({
        type: mode, amount: amt, note: form.note.trim(), date: form.date,
      })
      if (error) throw error
      toast.success(mode === 'income' ? 'Income recorded!' : 'Expense recorded!')
      setForm(defaultForm)
      setMode(null)
      await load()
    } catch { toast.error('Failed to save.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('cash_entries').delete().eq('id', pendingDelete)
      if (error) throw error
      toast.success('Entry deleted.')
      setPendingDelete(null)
      await load()
    } catch { toast.error('Failed to delete.') }
    finally { setDeleting(false) }
  }

  async function handleSaveOpening() {
    const amt = parseFloat(openingAmount)
    if (isNaN(amt)) { toast.error('Enter a valid amount.'); return }
    try {
      if (openingEntry) {
        await supabase.from('cash_entries').update({ amount: amt }).eq('id', openingEntry.id)
      } else {
        await supabase.from('cash_entries').insert({ type: 'opening', amount: amt, note: 'Opening balance', date: new Date().toISOString().split('T')[0] })
      }
      toast.success('Opening balance updated.')
      setEditingOpening(false)
      await load()
    } catch { toast.error('Failed to update.') }
  }

  async function handleDeposit() {
    if (!pendingDeposit) return
    setActioning(true)
    try {
      await supabase.from('cheques').update({ status: 'deposited' }).eq('id', pendingDeposit.id)
      await supabase.from('cash_entries').insert({
        type: 'income',
        amount: pendingDeposit.amount,
        note: `Cheque deposited — ${pendingDeposit.party_name}${pendingDeposit.cheque_number ? ` (${pendingDeposit.cheque_number})` : ''}`,
        date: new Date().toISOString().split('T')[0],
      })
      toast.success('Cheque marked as deposited!')
      setPendingDeposit(null)
      await load()
    } catch { toast.error('Failed to update.') }
    finally { setActioning(false) }
  }

  async function handleBounce() {
    if (!pendingBounce) return
    setActioning(true)
    try {
      await supabase.from('cheques').update({ status: 'bounced' }).eq('id', pendingBounce)
      toast.success('Cheque marked as bounced.')
      setPendingBounce(null)
      await load()
    } catch { toast.error('Failed to update.') }
    finally { setActioning(false) }
  }

  function getPhotoUrl(path: string): string {
    const { data } = supabase.storage.from('cheques').getPublicUrl(path)
    return data.publicUrl
  }

  const unifiedActivity: UnifiedActivityRow[] = (() => {
    const txRows: UnifiedActivityRow[] = cashTxRows.map(t => ({
      key: `tx-${t.id}`,
      source: 'transaction',
      displayType: t.type === 'sale' ? 'income' : 'expense',
      amount: t.total_amount,
      note: `${t.type === 'sale' ? 'Sale' : 'Purchase'} — ${t.ledgers?.name ?? '—'}${t.items?.name ? ` · ${t.items.name}` : ''}`,
      date: t.date,
      sortTs: new Date(t.created_at).getTime(),
    }))
    const manualRows: UnifiedActivityRow[] = entries
      .filter(e => e.type !== 'opening' && e.category !== 'petty_cash' && !isLegacyTransactionCashMirror(e))
      .map(e => ({
        key: `cash-${e.id}`,
        source: 'manual',
        cashEntryId: e.id,
        displayType: e.type === 'income' ? 'income' : 'expense',
        amount: e.amount,
        note: e.note,
        date: e.date,
        sortTs: new Date(e.created_at).getTime(),
      }))
    return [...txRows, ...manualRows].sort((a, b) => b.sortTs - a.sortTs)
  })()

  const qtyN = parseFloat(pettyForm.quantity) || 0
  const rateN = parseFloat(pettyForm.rate) || 0
  const computedPettyAmount = qtyN > 0 && rateN > 0 ? qtyN * rateN : null

  async function handlePettySubmit(e: React.FormEvent) {
    e.preventDefault()
    const purpose = pettyForm.purpose.trim()
    if (!purpose) { toast.error('Enter a purpose.'); return }
    const amt = computedPettyAmount != null ? computedPettyAmount : parseFloat(pettyForm.amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount.'); return }
    setPettySubmitting(true)
    try {
      const cashNote = `Petty cash — ${purpose}${pettyForm.party_name.trim() ? ` · ${pettyForm.party_name.trim()}` : ''}`
      const { data: cashRow, error: cashErr } = await supabase.from('cash_entries').insert({
        type: 'expense',
        amount: amt,
        note: cashNote,
        date: pettyForm.date,
        category: 'petty_cash',
      }).select().single()
      if (cashErr) throw cashErr
      const { error: pettyErr } = await supabase.from('petty_cash').insert({
        party_name: pettyForm.party_name.trim() || null,
        item: pettyForm.item.trim() || null,
        quantity: parseFloat(pettyForm.quantity) > 0 ? parseFloat(pettyForm.quantity) : null,
        rate: parseFloat(pettyForm.rate) > 0 ? parseFloat(pettyForm.rate) : null,
        amount: amt,
        purpose,
        note: pettyForm.note.trim() || null,
        date: pettyForm.date,
        cash_entry_id: cashRow.id,
      })
      if (pettyErr) throw pettyErr
      toast.success('Expense recorded')
      setPettyForm(defaultPettyForm)
      setShowPettyForm(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save petty cash.')
    }
    finally { setPettySubmitting(false) }
  }

  async function handleDeletePetty() {
    if (!pendingPettyDelete) return
    const row = pettyRows.find(p => p.id === pendingPettyDelete)
    if (!row) { setPendingPettyDelete(null); return }
    setDeletingPetty(true)
    try {
      const { error } = await supabase.from('cash_entries').delete().eq('id', row.cash_entry_id)
      if (error) throw error
      toast.success('Petty cash removed.')
      setPendingPettyDelete(null)
      await load()
    } catch { toast.error('Failed to delete.') }
    finally { setDeletingPetty(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* FIXED HEADER */}
      <div style={{
        flexShrink: 0, background: '#0F1117',
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10,
      }}>
        <div style={{ padding: '14px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Cash & Bank</h1>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
              <LogoutIcon />
            </button>
          </div>
          <div style={{ textAlign: 'center', paddingBottom: 4 }}>
            <p style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 4 }}>Current balance</p>
            {loading ? (
              <div style={{ height: 44, background: 'rgba(255,255,255,0.05)', borderRadius: 8, margin: '0 auto', width: 180 }} />
            ) : (
              <p className="font-mono-numbers" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color: balance >= 0 ? '#10B981' : '#F43F5E' }}>
                {formatNPR(balance)}
              </p>
            )}
            {!loading && pendingIncoming > 0 && (
              <p style={{ fontSize: 12, color: '#F59E0B', marginTop: 6, fontWeight: 500 }}>
                + {formatNPR(pendingIncoming)} pending cheques to deposit
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehavior: 'contain',
        padding: '16px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => { setMode(mode === 'income' ? null : 'income'); setForm(defaultForm) }}
            style={{ padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: mode === 'income' ? '#10B981' : '#1A1D27', color: mode === 'income' ? '#FFFFFF' : '#10B981', border: mode === 'income' ? 'none' : '1px solid rgba(16,185,129,0.3)', transition: 'all 0.15s' }}>
            + Income
          </button>
          <button onClick={() => { setMode(mode === 'expense' ? null : 'expense'); setForm(defaultForm) }}
            style={{ padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: mode === 'expense' ? '#F59E0B' : '#1A1D27', color: mode === 'expense' ? '#111827' : '#F59E0B', border: mode === 'expense' ? 'none' : '1px solid rgba(245,158,11,0.3)', transition: 'all 0.15s' }}>
            − Expense
          </button>
        </div>

        {/* Opening balance */}
        <div style={{ background: '#1A1D27', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {editingOpening ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Opening balance</p>
              <input type="number" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
                placeholder="0.00" autoFocus
                style={{ width: '100%', padding: '11px 14px', background: '#0F1117', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 16, boxSizing: 'border-box' as const, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveOpening} style={{ flex: 1, padding: '11px 0', background: '#F59E0B', color: '#111827', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingOpening(false)} style={{ flex: 1, padding: '11px 0', background: 'rgba(255,255,255,0.07)', color: '#94A3B8', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 2 }}>Opening balance</p>
                <p className="font-mono-numbers" style={{ fontSize: 16, fontWeight: 700, color: '#94A3B8' }}>{formatNPR(opening)}</p>
              </div>
              <button onClick={() => { setEditingOpening(true); setOpeningAmount(String(opening)) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 6, display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
                <SmallPencilIcon />
              </button>
            </div>
          )}
        </div>

        {/* Add entry form */}
        {mode && (
          <div className="fade-in" style={{ background: '#1A1D27', borderRadius: 12, padding: '16px', border: `1px solid ${mode === 'income' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: mode === 'income' ? '#10B981' : '#F59E0B', marginBottom: 12 }}>
              {mode === 'income' ? '+ New Income' : '− New Expense'}
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Amount (रू)</label>
                <input type="number" min="0" step="any" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" autoFocus style={inp} required />
              </div>
              <div>
                <label style={lbl}>Note (what is this for?)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder={mode === 'income' ? 'e.g. sale payment, advance...' : 'e.g. rent, salary, transport...'} style={inp} required />
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} required />
              </div>
              <button type="submit" disabled={submitting} style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                background: submitting ? '#222637' : mode === 'income' ? '#10B981' : '#F59E0B',
                color: submitting ? '#475569' : mode === 'income' ? '#FFFFFF' : '#111827', opacity: submitting ? 0.8 : 1,
              }}>
                {submitting ? 'Saving…' : `Save ${mode === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </form>
          </div>
        )}

        {/* Pending Cheques */}
        {pendingCheques.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 10 }}>Pending Cheques</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingCheques.map(cheque => {
                const isIncoming = cheque.direction === 'incoming'
                const dl = dueDateLabel(cheque.due_date)
                return (
                  <div key={cheque.id} style={{ background: '#1A1D27', borderRadius: 14, padding: '14px 16px', border: `1px solid ${dl.color === '#F43F5E' ? 'rgba(244,63,94,0.25)' : dl.color === '#F59E0B' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: isIncoming ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: isIncoming ? '#10B981' : '#F43F5E' }}>
                            {isIncoming ? '↓ To Deposit' : '↑ To Pay'}
                          </span>
                          <span style={{ fontSize: 11, color: dl.color, fontWeight: 600 }}>{dl.text}</span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 2 }}>{cheque.party_name}</p>
                        {(cheque.cheque_number || cheque.bank_name) && (
                          <p style={{ fontSize: 11, color: '#475569' }}>
                            {[cheque.cheque_number, cheque.bank_name].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: 12 }}>
                        <p className="font-mono-numbers" style={{ fontSize: 16, fontWeight: 700, color: isIncoming ? '#10B981' : '#F43F5E' }}>
                          {formatNPR(cheque.amount)}
                        </p>
                        {cheque.photo_url && (
                          <button onClick={() => setPhotoModal(getPhotoUrl(cheque.photo_url!))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', fontSize: 11, fontWeight: 600, padding: '4px 0' }}>
                            📷 View
                          </button>
                        )}
                      </div>
                    </div>
                    {isIncoming && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => setPendingDeposit(cheque)}
                          style={{ flex: 1, padding: '10px 0', background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          ✓ Mark Deposited
                        </button>
                        <button onClick={() => setPendingBounce(cheque.id)}
                          style={{ padding: '10px 16px', background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          Bounced
                        </button>
                      </div>
                    )}
                    {!isIncoming && (
                      <button onClick={() => setPendingBounce(cheque.id)}
                        style={{ width: '100%', marginTop: 10, padding: '10px 0', background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        Mark as Paid / Bounced
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Petty Cash */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>Petty Cash</p>
            <button type="button" onClick={() => {
              setShowPettyForm(v => {
                if (v) setPettyForm(defaultPettyForm)
                return !v
              })
            }}
              style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', background: '#F59E0B', color: '#111827', border: 'none' }}>
              {showPettyForm ? 'Close' : '+ Add'}
            </button>
          </div>
          {showPettyForm && (
            <form onSubmit={handlePettySubmit} className="fade-in" style={{ background: '#1A1D27', borderRadius: 12, padding: '16px', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Small expenses — labour, transport, supplies (no stock)</p>
              <div>
                <label style={lbl}>Purpose *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {(['Labour', 'Transport', 'Office', 'Other'] as const).map(label => {
                    const active = pettyForm.purpose === label
                    return (
                      <button key={label} type="button" onClick={() => setPettyForm(f => ({ ...f, purpose: label }))}
                        style={{
                          padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: active ? 'rgba(245,158,11,0.15)' : '#0F1117',
                          color: active ? '#F59E0B' : '#94A3B8',
                          border: active ? '1px solid #F59E0B' : '1px solid rgba(245,158,11,0.35)',
                        }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
                <input type="text" value={pettyForm.purpose} onChange={e => setPettyForm(f => ({ ...f, purpose: e.target.value }))}
                  placeholder="Or type a custom purpose…" style={inp} required />
              </div>
              <div>
                <label style={lbl}>Party Name (optional)</label>
                <input type="text" value={pettyForm.party_name} onChange={e => setPettyForm(f => ({ ...f, party_name: e.target.value }))} placeholder="Who you paid" style={inp} />
              </div>
              <div>
                <label style={lbl}>Item (optional)</label>
                <input type="text" value={pettyForm.item} onChange={e => setPettyForm(f => ({ ...f, item: e.target.value }))} placeholder="What it was for" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Quantity (optional)</label>
                  <input type="number" min="0" step="any" value={pettyForm.quantity} onChange={e => setPettyForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Rate (optional)</label>
                  <input type="number" min="0" step="any" value={pettyForm.rate} onChange={e => setPettyForm(f => ({ ...f, rate: e.target.value }))} placeholder="0" style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Amount * (रू)</label>
                <input type="number" min="0" step="any" value={pettyForm.amount} onChange={e => setPettyForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" className="font-mono-numbers" style={{ ...inp, fontSize: 20, fontWeight: 700 }} required />
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={pettyForm.date} onChange={e => setPettyForm(f => ({ ...f, date: e.target.value }))} style={inp} required />
              </div>
              <div>
                <label style={lbl}>Note (optional)</label>
                <textarea value={pettyForm.note} onChange={e => setPettyForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Extra detail…" rows={3} style={{ ...inp, resize: 'vertical', minHeight: 72 }} />
              </div>
              <button type="submit" disabled={pettySubmitting} style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 700, cursor: pettySubmitting ? 'not-allowed' : 'pointer',
                background: pettySubmitting ? '#222637' : '#F59E0B', color: pettySubmitting ? '#475569' : '#111827',
              }}>
                {pettySubmitting ? 'Saving…' : 'Record Expense'}
              </button>
            </form>
          )}
          {loading ? (
            <div style={{ ...cardStyle, padding: 16 }}><div style={{ height: 40, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} /></div>
          ) : pettyRows.length === 0 ? (
            <div style={{ ...cardStyle, padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#475569' }}>No petty cash entries yet</p>
            </div>
          ) : (
            <div style={cardStyle}>
              {pettyRows.map((p, idx) => (
                <div key={p.id}>
                  {idx > 0 && <div style={divider} />}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginBottom: 2 }}>{p.purpose}</p>
                      {p.party_name && <p style={{ fontSize: 12, color: '#475569' }}>{p.party_name}</p>}
                      <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{p.date}</p>
                    </div>
                    <p className="font-mono-numbers" style={{ fontSize: 14, fontWeight: 700, color: '#F43F5E', flexShrink: 0 }}>
                      −{formatNPR(p.amount)}
                    </p>
                    <button type="button" onClick={() => setPendingPettyDelete(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 6, display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 44, justifyContent: 'center', flexShrink: 0 }}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity — cash sales/purchases + manual entries */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 10 }}>Activity</p>
          {loading ? (
            <div style={cardStyle}>
              {[1, 2, 3].map((i, idx) => (
                <div key={i}>
                  {idx > 0 && <div style={divider} />}
                  <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ height: 13, width: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
                    <div style={{ height: 13, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : unifiedActivity.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>No activity yet. Record a cash sale or add an entry.</p>
            </div>
          ) : (
            <div style={cardStyle}>
              {unifiedActivity.map((row, idx) => {
                const isIncome = row.displayType === 'income'
                return (
                  <div key={row.key}>
                    {idx > 0 && <div style={divider} />}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isIncome ? '#10B981' : '#F59E0B', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          {row.source === 'transaction' && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}>TX</span>
                          )}
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{row.note}</p>
                        </div>
                        <p style={{ fontSize: 11, color: '#475569' }}>{row.date}</p>
                      </div>
                      <p className="font-mono-numbers" style={{ fontSize: 13, fontWeight: 700, color: isIncome ? '#10B981' : '#F59E0B', flexShrink: 0 }}>
                        {isIncome ? '+' : '−'}{formatNPR(row.amount)}
                      </p>
                      {row.source === 'manual' ? (
                        <button type="button" onClick={() => setPendingDelete(row.cashEntryId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 6, display: 'flex', alignItems: 'center', minWidth: 36, minHeight: 44, justifyContent: 'center', flexShrink: 0 }}>
                          <TrashIcon />
                        </button>
                      ) : (
                        <div style={{ minWidth: 36, minHeight: 44, flexShrink: 0 }} aria-hidden />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Photo modal */}
      {photoModal && (
        <div onClick={() => setPhotoModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoModal} alt="Cheque" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}

      <ConfirmDialog open={!!pendingDelete} title="Delete this entry?"
        message="This cash entry will be permanently removed."
        onCancel={() => setPendingDelete(null)} onConfirm={handleDelete} loading={deleting} />

      <ConfirmDialog open={!!pendingDeposit} title="Mark cheque as deposited?"
        message={`This will add ${pendingDeposit ? formatNPR(pendingDeposit.amount) : ''} to your cash balance.`}
        onCancel={() => setPendingDeposit(null)} onConfirm={handleDeposit} loading={actioning} />

      <ConfirmDialog open={!!pendingBounce} title="Mark as bounced / paid?"
        message="This cheque will be marked as closed. No cash entry will be created."
        onCancel={() => setPendingBounce(null)} onConfirm={handleBounce} loading={actioning} />

      <ConfirmDialog open={!!pendingPettyDelete} title="Delete this petty cash entry?"
        message="This removes the expense and restores your cash balance for that amount."
        onCancel={() => setPendingPettyDelete(null)} onConfirm={handleDeletePetty} loading={deletingPetty} />
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

function SmallPencilIcon() {
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

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#94A3B8', display: 'block', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#0F1117', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 16, boxSizing: 'border-box', outline: 'none' }
const cardStyle: React.CSSProperties = { background: '#1A1D27', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }
const divider: React.CSSProperties = { height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }
