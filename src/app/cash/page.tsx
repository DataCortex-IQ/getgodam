'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatNPR } from '@/lib/format'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'

interface CashEntry {
  id: string
  type: 'opening' | 'income' | 'expense'
  amount: number
  note: string
  date: string
  created_at: string
}

const defaultForm = { amount: '', note: '', date: new Date().toISOString().split('T')[0] }

export default function CashPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'income' | 'expense' | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingOpening, setEditingOpening] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('cash_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openingEntry = entries.find(e => e.type === 'opening')
  const opening = openingEntry?.amount ?? 0
  const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const balance = opening + income - expense

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

  const visibleEntries = entries.filter(e => e.type !== 'opening')

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Cash & Bank</h1>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
              <LogoutIcon />
            </button>
          </div>
          {/* Balance display */}
          <div style={{ textAlign: 'center', paddingBottom: 4 }}>
            <p style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 4 }}>Current balance</p>
            {loading ? (
              <div style={{ height: 44, background: 'rgba(255,255,255,0.05)', borderRadius: 8, margin: '0 auto', width: 180 }} />
            ) : (
              <p className="font-mono-numbers" style={{
                fontSize: 38, fontWeight: 700, lineHeight: 1,
                color: balance >= 0 ? '#10B981' : '#F43F5E',
              }}>
                {formatNPR(balance)}
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
          <button
            onClick={() => { setMode(mode === 'income' ? null : 'income'); setForm(defaultForm) }}
            style={{
              padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: mode === 'income' ? '#10B981' : '#1A1D27',
              color: mode === 'income' ? '#FFFFFF' : '#10B981',
              border: mode === 'income' ? 'none' : '1px solid rgba(16,185,129,0.3)',
              transition: 'all 0.15s',
            }}>
            + Income
          </button>
          <button
            onClick={() => { setMode(mode === 'expense' ? null : 'expense'); setForm(defaultForm) }}
            style={{
              padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: mode === 'expense' ? '#F59E0B' : '#1A1D27',
              color: mode === 'expense' ? '#111827' : '#F59E0B',
              border: mode === 'expense' ? 'none' : '1px solid rgba(245,158,11,0.3)',
              transition: 'all 0.15s',
            }}>
            − Expense
          </button>
        </div>

        {/* Opening balance row */}
        <div style={{ background: '#1A1D27', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {editingOpening ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Opening balance</p>
              <input type="number" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
                placeholder="0.00" autoFocus
                style={{ width: '100%', padding: '11px 14px', background: '#0F1117', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 16, boxSizing: 'border-box' as const, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveOpening}
                  style={{ flex: 1, padding: '11px 0', background: '#F59E0B', color: '#111827', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Save
                </button>
                <button onClick={() => setEditingOpening(false)}
                  style={{ flex: 1, padding: '11px 0', background: 'rgba(255,255,255,0.07)', color: '#94A3B8', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  Cancel
                </button>
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
                <input type="number" min="0" step="any" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" autoFocus style={inp} required />
              </div>
              <div>
                <label style={lbl}>Note (what is this for?)</label>
                <input type="text" value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder={mode === 'income' ? 'e.g. sale payment, advance...' : 'e.g. rent, salary, transport...'}
                  style={inp} required />
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={inp} required />
              </div>
              <button type="submit" disabled={submitting} style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                background: submitting ? '#222637' : mode === 'income' ? '#10B981' : '#F59E0B',
                color: submitting ? '#475569' : mode === 'income' ? '#FFFFFF' : '#111827',
                opacity: submitting ? 0.8 : 1,
              }}>
                {submitting ? 'Saving…' : `Save ${mode === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </form>
          </div>
        )}

        {/* Entries list */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 10 }}>Entries</p>
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
          ) : visibleEntries.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                No entries yet.{'\n'}Set your opening balance to get started.
              </p>
            </div>
          ) : (
            <div style={cardStyle}>
              {visibleEntries.map((entry, idx) => {
                const isIncome = entry.type === 'income'
                return (
                  <div key={entry.id}>
                    {idx > 0 && <div style={divider} />}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isIncome ? '#10B981' : '#F59E0B', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>{entry.note}</p>
                        <p style={{ fontSize: 11, color: '#475569' }}>{entry.date}</p>
                      </div>
                      <p className="font-mono-numbers" style={{ fontSize: 13, fontWeight: 700, color: isIncome ? '#10B981' : '#F59E0B', flexShrink: 0 }}>
                        {isIncome ? '+' : '−'}{formatNPR(entry.amount)}
                      </p>
                      <button onClick={() => setPendingDelete(entry.id)}
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
        message="This cash entry will be permanently removed."
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
