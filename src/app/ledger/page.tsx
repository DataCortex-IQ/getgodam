'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Ledger {
  id: string
  name: string
  vat_no: string | null
  pan_no: string | null
  type: 'supplier' | 'customer' | 'both'
}

interface Item {
  id: string
  name: string
  default_unit: string
}

type EditPartyForm = { name: string; vat_no: string; pan_no: string; type: Ledger['type'] }
type EditItemForm = { name: string; default_unit: string }

const typeColors: Record<string, { bg: string; color: string }> = {
  supplier: { bg: '#DBEAFE', color: '#1E40AF' },
  customer: { bg: '#D1FAE5', color: '#065F46' },
  both: { bg: '#EDE9FE', color: '#5B21B6' },
}

export default function LedgerPage() {
  const [tab, setTab] = useState<'parties' | 'items'>('parties')
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // Add forms
  const [partyForm, setPartyForm] = useState({ name: '', vat_no: '', pan_no: '', type: 'customer' as Ledger['type'] })
  const [addingParty, setAddingParty] = useState(false)
  const [showPartyForm, setShowPartyForm] = useState(false)
  const [itemForm, setItemForm] = useState({ name: '', default_unit: '' })
  const [addingItem, setAddingItem] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)

  // Edit state
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null)
  const [editPartyForm, setEditPartyForm] = useState<EditPartyForm>({ name: '', vat_no: '', pan_no: '', type: 'customer' })
  const [savingParty, setSavingParty] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemForm, setEditItemForm] = useState<EditItemForm>({ name: '', default_unit: '' })
  const [savingItem, setSavingItem] = useState(false)

  // Delete state
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
    setEditPartyForm({
      name: l.name,
      vat_no: l.vat_no ?? '',
      pan_no: l.pan_no ?? '',
      type: l.type,
    })
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
      const { error } = await supabase
        .from('ledgers')
        .update({
          name: editPartyForm.name.trim(),
          vat_no: editPartyForm.vat_no.trim() || null,
          pan_no: editPartyForm.pan_no.trim() || null,
          type: editPartyForm.type,
        })
        .eq('id', editingPartyId!)
      if (error) throw error
      toast.success('Party updated.')
      setEditingPartyId(null)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update party.')
    } finally {
      setSavingParty(false)
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    if (!editItemForm.name.trim() || !editItemForm.default_unit.trim()) {
      return toast.error('Name and unit are required.')
    }
    setSavingItem(true)
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: editItemForm.name.trim(),
          default_unit: editItemForm.default_unit.trim().toUpperCase(),
        })
        .eq('id', editingItemId!)
      if (error) throw error
      toast.success('Item updated.')
      setEditingItemId(null)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update item.')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleAddParty(e: React.FormEvent) {
    e.preventDefault()
    if (!partyForm.name.trim()) return toast.error('Name is required.')
    setAddingParty(true)
    try {
      const { error } = await supabase.from('ledgers').insert({
        name: partyForm.name.trim(),
        vat_no: partyForm.vat_no.trim() || null,
        pan_no: partyForm.pan_no.trim() || null,
        type: partyForm.type,
      })
      if (error) throw error
      toast.success('Party added!')
      setPartyForm({ name: '', vat_no: '', pan_no: '', type: 'customer' })
      setShowPartyForm(false)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to add party.')
    } finally {
      setAddingParty(false)
    }
  }

  async function handleDeleteParty() {
    if (!pendingDeleteParty) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('ledgers').delete().eq('id', pendingDeleteParty.id)
      if (error) {
        if (error.code === '23503') {
          toast.error('Cannot delete — this party has existing transactions.')
        } else {
          throw error
        }
      } else {
        toast.success('Party deleted.')
        await loadData()
      }
      setPendingDeleteParty(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete party.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemForm.name.trim() || !itemForm.default_unit.trim()) {
      return toast.error('Name and unit are required.')
    }
    setAddingItem(true)
    try {
      const { error } = await supabase.from('items').insert({
        name: itemForm.name.trim(),
        default_unit: itemForm.default_unit.trim().toUpperCase(),
      })
      if (error) throw error
      toast.success('Item added!')
      setItemForm({ name: '', default_unit: '' })
      setShowItemForm(false)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to add item.')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleDeleteItem() {
    if (!pendingDeleteItem) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('items').delete().eq('id', pendingDeleteItem.id)
      if (error) {
        if (error.code === '23503') {
          toast.error('Cannot delete — this item has existing transactions.')
        } else {
          throw error
        }
      } else {
        toast.success('Item deleted.')
        await loadData()
      }
      setPendingDeleteItem(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete item.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div style={{ background: '#111827', padding: '52px 20px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>Ledger</h1>
        <p style={{ color: '#6B7280', fontSize: 13 }}>Manage parties and items</p>
      </div>

      <div style={{ padding: 16 }}>
        {/* Tab toggle */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 20
        }}>
          {(['parties', 'items'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 0', borderRadius: 8, border: 'none',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                background: tab === t ? '#111827' : 'transparent',
                color: tab === t ? '#FFFFFF' : '#6B7280',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading…</div>
        ) : tab === 'parties' ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {ledgers.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 24 }}>No parties yet.</p>
              ) : ledgers.map(l => (
                <div key={l.id} style={{
                  background: '#FFFFFF', borderRadius: 10,
                  border: editingPartyId === l.id ? '1px solid #F59E0B' : '1px solid #E5E7EB',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}>
                  {/* Row */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1, marginRight: 8 }}>{l.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          background: typeColors[l.type]?.bg ?? '#F3F4F6',
                          color: typeColors[l.type]?.color ?? '#374151',
                          fontSize: 10, fontWeight: 600, borderRadius: 20,
                          padding: '2px 8px', whiteSpace: 'nowrap',
                          textTransform: 'capitalize', marginRight: 4,
                        }}>
                          {l.type}
                        </span>
                        <button
                          onClick={() => editingPartyId === l.id ? setEditingPartyId(null) : startEditParty(l)}
                          title="Edit party"
                          style={{ ...iconBtnStyle, color: editingPartyId === l.id ? '#F59E0B' : '#6B7280' }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() => setPendingDeleteParty(l)}
                          title="Delete party"
                          style={{ ...iconBtnStyle, color: '#D1D5DB' }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    {(l.vat_no || l.pan_no) && (
                      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                        {[l.vat_no && `VAT: ${l.vat_no}`, l.pan_no && `PAN: ${l.pan_no}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Inline edit form */}
                  {editingPartyId === l.id && (
                    <form
                      onSubmit={handleSaveParty}
                      style={{
                        borderTop: '1px solid #FDE68A',
                        background: '#FFFBEB',
                        padding: '12px 14px',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                    >
                      <input
                        placeholder="Party name *"
                        value={editPartyForm.name}
                        onChange={e => setEditPartyForm(f => ({ ...f, name: e.target.value }))}
                        style={inputStyle}
                        required
                        autoFocus
                      />
                      <input
                        placeholder="VAT No (optional)"
                        value={editPartyForm.vat_no}
                        onChange={e => setEditPartyForm(f => ({ ...f, vat_no: e.target.value }))}
                        style={inputStyle}
                      />
                      <input
                        placeholder="PAN No (optional)"
                        value={editPartyForm.pan_no}
                        onChange={e => setEditPartyForm(f => ({ ...f, pan_no: e.target.value }))}
                        style={inputStyle}
                      />
                      <select
                        value={editPartyForm.type}
                        onChange={e => setEditPartyForm(f => ({ ...f, type: e.target.value as Ledger['type'] }))}
                        style={inputStyle}
                      >
                        <option value="customer">Customer</option>
                        <option value="supplier">Supplier</option>
                        <option value="both">Both</option>
                      </select>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button type="button" onClick={() => setEditingPartyId(null)} style={cancelBtnStyle}>
                          Cancel
                        </button>
                        <button type="submit" disabled={savingParty} style={editSaveBtnStyle}>
                          {savingParty ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>

            {!showPartyForm ? (
              <button onClick={() => setShowPartyForm(true)} style={addBtnStyle}>+ Add Party</button>
            ) : (
              <form onSubmit={handleAddParty} style={formStyle}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>New Party</p>
                <input placeholder="Party name *" value={partyForm.name} onChange={e => setPartyForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
                <input placeholder="VAT No (optional)" value={partyForm.vat_no} onChange={e => setPartyForm(f => ({ ...f, vat_no: e.target.value }))} style={inputStyle} />
                <input placeholder="PAN No (optional)" value={partyForm.pan_no} onChange={e => setPartyForm(f => ({ ...f, pan_no: e.target.value }))} style={inputStyle} />
                <select value={partyForm.type} onChange={e => setPartyForm(f => ({ ...f, type: e.target.value as Ledger['type'] }))} style={inputStyle}>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="both">Both</option>
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" onClick={() => setShowPartyForm(false)} style={cancelBtnStyle}>Cancel</button>
                  <button type="submit" disabled={addingParty} style={saveBtnStyle}>{addingParty ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {items.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 24 }}>No items yet.</p>
              ) : items.map(item => (
                <div key={item.id} style={{
                  background: '#FFFFFF', borderRadius: 10,
                  border: editingItemId === item.id ? '1px solid #F59E0B' : '1px solid #E5E7EB',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}>
                  {/* Row */}
                  <div style={{
                    padding: '12px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        background: '#F3F4F6', color: '#374151',
                        fontSize: 11, fontWeight: 700, borderRadius: 6,
                        padding: '3px 8px', marginRight: 4,
                      }}>
                        {item.default_unit}
                      </span>
                      <button
                        onClick={() => editingItemId === item.id ? setEditingItemId(null) : startEditItem(item)}
                        title="Edit item"
                        style={{ ...iconBtnStyle, color: editingItemId === item.id ? '#F59E0B' : '#6B7280' }}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => setPendingDeleteItem(item)}
                        title="Delete item"
                        style={{ ...iconBtnStyle, color: '#D1D5DB' }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editingItemId === item.id && (
                    <form
                      onSubmit={handleSaveItem}
                      style={{
                        borderTop: '1px solid #FDE68A',
                        background: '#FFFBEB',
                        padding: '12px 14px',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                    >
                      <input
                        placeholder="Item name *"
                        value={editItemForm.name}
                        onChange={e => setEditItemForm(f => ({ ...f, name: e.target.value }))}
                        style={inputStyle}
                        required
                        autoFocus
                      />
                      <input
                        placeholder="Default unit (e.g. CTN, BAG, KG) *"
                        value={editItemForm.default_unit}
                        onChange={e => setEditItemForm(f => ({ ...f, default_unit: e.target.value }))}
                        style={inputStyle}
                        required
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button type="button" onClick={() => setEditingItemId(null)} style={cancelBtnStyle}>
                          Cancel
                        </button>
                        <button type="submit" disabled={savingItem} style={editSaveBtnStyle}>
                          {savingItem ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>

            {!showItemForm ? (
              <button onClick={() => setShowItemForm(true)} style={addBtnStyle}>+ Add Item</button>
            ) : (
              <form onSubmit={handleAddItem} style={formStyle}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>New Item</p>
                <input placeholder="Item name *" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
                <input placeholder="Default unit (e.g. CTN, BAG, KG) *" value={itemForm.default_unit} onChange={e => setItemForm(f => ({ ...f, default_unit: e.target.value }))} style={inputStyle} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" onClick={() => setShowItemForm(false)} style={cancelBtnStyle}>Cancel</button>
                  <button type="submit" disabled={addingItem} style={saveBtnStyle}>{addingItem ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteParty}
        title="Delete this party?"
        message={`"${pendingDeleteParty?.name}" will be permanently removed.`}
        onCancel={() => setPendingDeleteParty(null)}
        onConfirm={handleDeleteParty}
        loading={deleting}
      />

      <ConfirmDialog
        open={!!pendingDeleteItem}
        title="Delete this item?"
        message={`"${pendingDeleteItem?.name}" will be permanently removed.`}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={handleDeleteItem}
        loading={deleting}
      />
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  border: '1px solid #E5E7EB', borderRadius: 8,
  fontSize: 14, color: '#111827', background: '#FFFFFF',
  boxSizing: 'border-box', outline: 'none',
}

const formStyle: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 12, padding: 16,
  border: '1px solid #E5E7EB', display: 'flex',
  flexDirection: 'column', gap: 10,
}

const addBtnStyle: React.CSSProperties = {
  width: '100%', padding: '13px 0',
  background: '#111827', color: '#F59E0B',
  border: 'none', borderRadius: 10,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '11px 0', background: '#F3F4F6',
  color: '#374151', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

const saveBtnStyle: React.CSSProperties = {
  padding: '11px 0', background: '#111827',
  color: '#F59E0B', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

const editSaveBtnStyle: React.CSSProperties = {
  padding: '11px 0', background: '#F59E0B',
  color: '#111827', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '6px', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 32, minHeight: 32,
}
