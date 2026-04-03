'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Ledger {
  id: string; name: string; vat_no: string | null; pan_no: string | null; type: 'supplier' | 'customer' | 'both'
}
interface Item { id: string; name: string; default_unit: string }

type EditPartyForm = { name: string; vat_no: string; pan_no: string; type: Ledger['type'] }
type EditItemForm = { name: string; default_unit: string }

const typeColors: Record<string, { bg: string; color: string }> = {
  supplier: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA' },
  customer: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
  both: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
}

function initials(name: string, n = 2) {
  return name.trim().split(/\s+/).slice(0, n).map(w => w[0]).join('').toUpperCase()
}

export default function LedgerPage() {
  const [tab, setTab] = useState<'parties' | 'items'>('parties')
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const [partyForm, setPartyForm] = useState({ name: '', vat_no: '', pan_no: '', type: 'customer' as Ledger['type'] })
  const [addingParty, setAddingParty] = useState(false)
  const [showPartyForm, setShowPartyForm] = useState(false)
  const [itemForm, setItemForm] = useState({ name: '', default_unit: '' })
  const [addingItem, setAddingItem] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)

  const [editingPartyId, setEditingPartyId] = useState<string | null>(null)
  const [editPartyForm, setEditPartyForm] = useState<EditPartyForm>({ name: '', vat_no: '', pan_no: '', type: 'customer' })
  const [savingParty, setSavingParty] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemForm, setEditItemForm] = useState<EditItemForm>({ name: '', default_unit: '' })
  const [savingItem, setSavingItem] = useState(false)

  const [pendingDeleteParty, setPendingDeleteParty] = useState<Ledger | null>(null)
  const [pendingDeleteItem, setPendingDeleteItem] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function loadData() {
    const [{ data: ledgerData }, { data: itemData }] = await Promise.all([
      supabase.from('ledgers').select('*').order('name'),
      supabase.from('items').select('*').order('name'),
    ])
    setLedgers((ledgerData as Ledger[]) ?? [])
    setItems((itemData as Item[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function startEditParty(l: Ledger) {
    setEditingPartyId(l.id)
    setEditPartyForm({ name: l.name, vat_no: l.vat_no ?? '', pan_no: l.pan_no ?? '', type: l.type })
  }

  function startEditItem(item: Item) {
    setEditingItemId(item.id)
    setEditItemForm({ name: item.name, default_unit: item.default_unit })
  }

  async function handleSaveParty(e: React.FormEvent) {
    e.preventDefault()
    if (!editPartyForm.name.trim()) return toast.error('Name is required.')
    setSavingParty(true)
    try {
      const { error } = await supabase.from('ledgers').update({
        name: editPartyForm.name.trim(),
        vat_no: editPartyForm.vat_no.trim() || null,
        pan_no: editPartyForm.pan_no.trim() || null,
        type: editPartyForm.type,
      }).eq('id', editingPartyId!)
      if (error) throw error
      toast.success('Party updated.')
      setEditingPartyId(null)
      await loadData()
    } catch { toast.error('Failed to update party.') }
    finally { setSavingParty(false) }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    if (!editItemForm.name.trim() || !editItemForm.default_unit.trim()) return toast.error('Name and unit are required.')
    setSavingItem(true)
    try {
      const { error } = await supabase.from('items').update({
        name: editItemForm.name.trim(),
        default_unit: editItemForm.default_unit.trim().toUpperCase(),
      }).eq('id', editingItemId!)
      if (error) throw error
      toast.success('Item updated.')
      setEditingItemId(null)
      await loadData()
    } catch { toast.error('Failed to update item.') }
    finally { setSavingItem(false) }
  }

  async function handleAddParty(e: React.FormEvent) {
    e.preventDefault()
    if (!partyForm.name.trim()) return toast.error('Name is required.')
    setAddingParty(true)
    try {
      const { error } = await supabase.from('ledgers').insert({
        name: partyForm.name.trim(), vat_no: partyForm.vat_no.trim() || null,
        pan_no: partyForm.pan_no.trim() || null, type: partyForm.type,
      })
      if (error) throw error
      toast.success('Party added!')
      setPartyForm({ name: '', vat_no: '', pan_no: '', type: 'customer' })
      setShowPartyForm(false)
      await loadData()
    } catch { toast.error('Failed to add party.') }
    finally { setAddingParty(false) }
  }

  async function handleDeleteParty() {
    if (!pendingDeleteParty) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('ledgers').delete().eq('id', pendingDeleteParty.id)
      if (error) {
        if (error.code === '23503') toast.error('Cannot delete — this party has existing transactions.')
        else throw error
      } else { toast.success('Party deleted.'); await loadData() }
      setPendingDeleteParty(null)
    } catch { toast.error('Failed to delete party.') }
    finally { setDeleting(false) }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemForm.name.trim() || !itemForm.default_unit.trim()) return toast.error('Name and unit are required.')
    setAddingItem(true)
    try {
      const { error } = await supabase.from('items').insert({
        name: itemForm.name.trim(), default_unit: itemForm.default_unit.trim().toUpperCase(),
      })
      if (error) throw error
      toast.success('Item added!')
      setItemForm({ name: '', default_unit: '' })
      setShowItemForm(false)
      await loadData()
    } catch { toast.error('Failed to add item.') }
    finally { setAddingItem(false) }
  }

  async function handleDeleteItem() {
    if (!pendingDeleteItem) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('items').delete().eq('id', pendingDeleteItem.id)
      if (error) {
        if (error.code === '23503') toast.error('Cannot delete — this item has existing transactions.')
        else throw error
      } else { toast.success('Item deleted.'); await loadData() }
      setPendingDeleteItem(null)
    } catch { toast.error('Failed to delete item.') }
    finally { setDeleting(false) }
  }

  return (
    <div style={{ background: '#0F1117', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>Ledger</h1>
        <p style={{ fontSize: 13, color: '#475569' }}>Manage parties and items</p>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Tab toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {(['parties', 'items'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '13px 0', borderRadius: 12,
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: tab === t ? '#F59E0B' : '#1A1D27',
              color: tab === t ? '#111827' : '#475569',
              border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.07)',
              transition: 'all 0.15s', textTransform: 'capitalize',
            } as React.CSSProperties}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Loading…</div>
        ) : tab === 'parties' ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {ledgers.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: 24 }}>No parties yet.</p>
              ) : ledgers.map(l => (
                <div key={l.id} style={{
                  background: '#1A1D27', borderRadius: 14,
                  border: editingPartyId === l.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden', transition: 'border-color 0.15s',
                }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Initials circle */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 20,
                      background: 'rgba(245,158,11,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#F59E0B', flexShrink: 0,
                    }}>
                      {initials(l.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>{l.name}</p>
                      {(l.vat_no || l.pan_no) && (
                        <p style={{ fontSize: 11, color: '#475569' }}>
                          {[l.vat_no && `VAT: ${l.vat_no}`, l.pan_no && `PAN: ${l.pan_no}`].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span style={{
                        background: typeColors[l.type]?.bg ?? 'rgba(255,255,255,0.07)',
                        color: typeColors[l.type]?.color ?? '#94A3B8',
                        fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px',
                        textTransform: 'capitalize', marginRight: 4,
                      }}>
                        {l.type}
                      </span>
                      <button onClick={() => editingPartyId === l.id ? setEditingPartyId(null) : startEditParty(l)}
                        style={{ ...iconBtn, color: editingPartyId === l.id ? '#F59E0B' : '#475569' }}>
                        <PencilIcon />
                      </button>
                      <button onClick={() => setPendingDeleteParty(l)} style={{ ...iconBtn, color: '#374151' }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {editingPartyId === l.id && (
                    <form onSubmit={handleSaveParty} style={inlineFormStyle}>
                      <input placeholder="Party name *" value={editPartyForm.name} onChange={e => setEditPartyForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required autoFocus />
                      <input placeholder="VAT No (optional)" value={editPartyForm.vat_no} onChange={e => setEditPartyForm(f => ({ ...f, vat_no: e.target.value }))} style={inputStyle} />
                      <input placeholder="PAN No (optional)" value={editPartyForm.pan_no} onChange={e => setEditPartyForm(f => ({ ...f, pan_no: e.target.value }))} style={inputStyle} />
                      <select value={editPartyForm.type} onChange={e => setEditPartyForm(f => ({ ...f, type: e.target.value as Ledger['type'] }))} style={inputStyle}>
                        <option value="customer">Customer</option>
                        <option value="supplier">Supplier</option>
                        <option value="both">Both</option>
                      </select>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button type="button" onClick={() => setEditingPartyId(null)} style={cancelBtn}>Cancel</button>
                        <button type="submit" disabled={savingParty} style={saveEditBtn}>{savingParty ? 'Saving…' : 'Save'}</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>

            {!showPartyForm ? (
              <button onClick={() => setShowPartyForm(true)} style={addBtn}>+ Add Party</button>
            ) : (
              <form onSubmit={handleAddParty} style={addFormStyle}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginBottom: 12 }}>New Party</p>
                <input placeholder="Party name *" value={partyForm.name} onChange={e => setPartyForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
                <input placeholder="VAT No (optional)" value={partyForm.vat_no} onChange={e => setPartyForm(f => ({ ...f, vat_no: e.target.value }))} style={inputStyle} />
                <input placeholder="PAN No (optional)" value={partyForm.pan_no} onChange={e => setPartyForm(f => ({ ...f, pan_no: e.target.value }))} style={inputStyle} />
                <select value={partyForm.type} onChange={e => setPartyForm(f => ({ ...f, type: e.target.value as Ledger['type'] }))} style={inputStyle}>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="both">Both</option>
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button" onClick={() => setShowPartyForm(false)} style={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={addingParty} style={saveDarkBtn}>{addingParty ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {items.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: 24 }}>No items yet.</p>
              ) : items.map(item => (
                <div key={item.id} style={{
                  background: '#1A1D27', borderRadius: 14,
                  border: editingItemId === item.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden', transition: 'border-color 0.15s',
                }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(16,185,129,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#10B981', flexShrink: 0,
                    }}>
                      {item.name[0].toUpperCase()}
                    </div>
                    <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>{item.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        background: 'rgba(255,255,255,0.07)', color: '#94A3B8',
                        fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '3px 8px',
                      }}>
                        {item.default_unit}
                      </span>
                      <button onClick={() => editingItemId === item.id ? setEditingItemId(null) : startEditItem(item)}
                        style={{ ...iconBtn, color: editingItemId === item.id ? '#F59E0B' : '#475569' }}>
                        <PencilIcon />
                      </button>
                      <button onClick={() => setPendingDeleteItem(item)} style={{ ...iconBtn, color: '#374151' }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {editingItemId === item.id && (
                    <form onSubmit={handleSaveItem} style={inlineFormStyle}>
                      <input placeholder="Item name *" value={editItemForm.name} onChange={e => setEditItemForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required autoFocus />
                      <input placeholder="Unit (e.g. CTN, BAG, KG) *" value={editItemForm.default_unit} onChange={e => setEditItemForm(f => ({ ...f, default_unit: e.target.value }))} style={inputStyle} required />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button type="button" onClick={() => setEditingItemId(null)} style={cancelBtn}>Cancel</button>
                        <button type="submit" disabled={savingItem} style={saveEditBtn}>{savingItem ? 'Saving…' : 'Save'}</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>

            {!showItemForm ? (
              <button onClick={() => setShowItemForm(true)} style={addBtn}>+ Add Item</button>
            ) : (
              <form onSubmit={handleAddItem} style={addFormStyle}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginBottom: 12 }}>New Item</p>
                <input placeholder="Item name *" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
                <input placeholder="Default unit (e.g. CTN, BAG, KG) *" value={itemForm.default_unit} onChange={e => setItemForm(f => ({ ...f, default_unit: e.target.value }))} style={inputStyle} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button" onClick={() => setShowItemForm(false)} style={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={addingItem} style={saveDarkBtn}>{addingItem ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!pendingDeleteParty} title="Delete this party?"
        message={`"${pendingDeleteParty?.name}" will be permanently removed.`}
        onCancel={() => setPendingDeleteParty(null)} onConfirm={handleDeleteParty} loading={deleting} />

      <ConfirmDialog open={!!pendingDeleteItem} title="Delete this item?"
        message={`"${pendingDeleteItem?.name}" will be permanently removed.`}
        onCancel={() => setPendingDeleteItem(null)} onConfirm={handleDeleteItem} loading={deleting} />
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px',
  background: '#0F1117', color: '#F1F5F9',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, fontSize: 14,
  boxSizing: 'border-box', outline: 'none',
}

const inlineFormStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(245,158,11,0.2)',
  background: 'rgba(245,158,11,0.04)',
  padding: '12px 14px',
  display: 'flex', flexDirection: 'column', gap: 8,
}

const addFormStyle: React.CSSProperties = {
  background: '#1A1D27', borderRadius: 14, padding: 16,
  border: '1px solid rgba(245,158,11,0.2)',
  borderTop: '3px solid #F59E0B',
  display: 'flex', flexDirection: 'column', gap: 10,
}

const addBtn: React.CSSProperties = {
  width: '100%', padding: '14px 0',
  background: 'rgba(245,158,11,0.1)',
  color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)',
  borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

const cancelBtn: React.CSSProperties = {
  padding: '11px 0', background: 'rgba(255,255,255,0.07)',
  color: '#94A3B8', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

const saveEditBtn: React.CSSProperties = {
  padding: '11px 0', background: '#F59E0B',
  color: '#111827', border: 'none',
  borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

const saveDarkBtn: React.CSSProperties = {
  padding: '11px 0', background: '#1E293B',
  color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)',
  borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '6px', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 32, minHeight: 32,
}
