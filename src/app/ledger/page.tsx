'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Ledger { id: string; name: string; vat_no: string | null; pan_no: string | null; type: 'supplier' | 'customer' | 'both' }
interface Item { id: string; name: string; default_unit: string }

interface ItemCost {
  id: string
  item_id: string
  label: string
  amount: number
  sort_order: number
}
type EditPartyForm = { name: string; vat_no: string; pan_no: string; type: Ledger['type'] }
type EditItemForm = { name: string; default_unit: string }

const typeColors: Record<string, { bg: string; color: string }> = {
  supplier: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA' },
  customer: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
  both: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function LedgerPage() {
  const router = useRouter()
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

  const [openCostSheetId, setOpenCostSheetId] = useState<string | null>(null)
  const [costRows, setCostRows] = useState<Record<string, ItemCost[]>>({})
  const [newCostLabel, setNewCostLabel] = useState('')
  const [newCostAmount, setNewCostAmount] = useState('')

  async function loadData() {
    const [{ data: l }, { data: i }] = await Promise.all([
      supabase.from('ledgers').select('*').order('name'),
      supabase.from('items').select('*').order('name'),
    ])
    setLedgers((l as Ledger[]) ?? [])
    setItems((i as Item[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleSaveParty(e: React.FormEvent) {
    e.preventDefault()
    if (!editPartyForm.name.trim()) return toast.error('Name is required.')
    setSavingParty(true)
    try {
      const { error } = await supabase.from('ledgers').update({ name: editPartyForm.name.trim(), vat_no: editPartyForm.vat_no.trim() || null, pan_no: editPartyForm.pan_no.trim() || null, type: editPartyForm.type }).eq('id', editingPartyId!)
      if (error) throw error
      toast.success('Party updated.')
      setEditingPartyId(null)
      await loadData()
    } catch { toast.error('Failed to update.') }
    finally { setSavingParty(false) }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    if (!editItemForm.name.trim() || !editItemForm.default_unit.trim()) return toast.error('Name and unit required.')
    setSavingItem(true)
    try {
      const { error } = await supabase.from('items').update({ name: editItemForm.name.trim(), default_unit: editItemForm.default_unit.trim().toUpperCase() }).eq('id', editingItemId!)
      if (error) throw error
      toast.success('Item updated.')
      setEditingItemId(null)
      await loadData()
    } catch { toast.error('Failed to update.') }
    finally { setSavingItem(false) }
  }

  async function handleAddParty(e: React.FormEvent) {
    e.preventDefault()
    if (!partyForm.name.trim()) return toast.error('Name is required.')
    setAddingParty(true)
    try {
      const { error } = await supabase.from('ledgers').insert({ name: partyForm.name.trim(), vat_no: partyForm.vat_no.trim() || null, pan_no: partyForm.pan_no.trim() || null, type: partyForm.type })
      if (error) throw error
      toast.success('Party added!')
      setPartyForm({ name: '', vat_no: '', pan_no: '', type: 'customer' })
      setShowPartyForm(false)
      await loadData()
    } catch { toast.error('Failed to add.') }
    finally { setAddingParty(false) }
  }

  async function handleDeleteParty() {
    if (!pendingDeleteParty) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('ledgers').delete().eq('id', pendingDeleteParty.id)
      if (error) { if (error.code === '23503') toast.error('Cannot delete — party has existing transactions.'); else throw error }
      else { toast.success('Party deleted.'); await loadData() }
      setPendingDeleteParty(null)
    } catch { toast.error('Failed to delete.') }
    finally { setDeleting(false) }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemForm.name.trim() || !itemForm.default_unit.trim()) return toast.error('Name and unit required.')
    setAddingItem(true)
    try {
      const { error } = await supabase.from('items').insert({ name: itemForm.name.trim(), default_unit: itemForm.default_unit.trim().toUpperCase() })
      if (error) throw error
      toast.success('Item added!')
      setItemForm({ name: '', default_unit: '' })
      setShowItemForm(false)
      await loadData()
    } catch { toast.error('Failed to add.') }
    finally { setAddingItem(false) }
  }

  async function handleDeleteItem() {
    if (!pendingDeleteItem) return
    const deletedId = pendingDeleteItem.id
    setDeleting(true)
    try {
      const { error } = await supabase.from('items').delete().eq('id', deletedId)
      if (error) { if (error.code === '23503') toast.error('Cannot delete — item has existing transactions.'); else throw error }
      else { toast.success('Item deleted.'); await loadData() }
      setPendingDeleteItem(null)
      if (openCostSheetId === deletedId) setOpenCostSheetId(null)
    } catch { toast.error('Failed to delete.') }
    finally { setDeleting(false) }
  }

  async function loadCostSheet(itemId: string) {
    const { data, error } = await supabase
      .from('item_costs')
      .select('id, item_id, label, amount, sort_order')
      .eq('item_id', itemId)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error(error)
      toast.error('Could not load cost sheet.')
      return
    }
    const rows: ItemCost[] = (data ?? []).map(r => ({
      id: r.id as string,
      item_id: r.item_id as string,
      label: r.label as string,
      amount: Number(r.amount),
      sort_order: Number(r.sort_order ?? 0),
    }))
    setCostRows(prev => ({ ...prev, [itemId]: rows }))
  }

  async function addCostRow(itemId: string) {
    const label = newCostLabel.trim()
    const amt = parseFloat(newCostAmount)
    if (!label || Number.isNaN(amt) || amt < 0) {
      toast.error('Enter a label and valid amount.')
      return
    }
    const nextOrder = costRows[itemId]?.length ?? 0
    const { error } = await supabase.from('item_costs').insert({
      item_id: itemId,
      label,
      amount: amt,
      sort_order: nextOrder,
    })
    if (error) {
      console.error(error)
      toast.error('Failed to add.')
      return
    }
    setNewCostLabel('')
    setNewCostAmount('')
    await loadCostSheet(itemId)
  }

  async function deleteCostRow(costId: string, itemId: string) {
    const { error } = await supabase.from('item_costs').delete().eq('id', costId)
    if (error) {
      console.error(error)
      toast.error('Failed to remove.')
      return
    }
    await loadCostSheet(itemId)
  }

  function toggleCostSheet(itemId: string) {
    if (openCostSheetId === itemId) {
      setOpenCostSheetId(null)
    } else {
      setNewCostLabel('')
      setNewCostAmount('')
      setOpenCostSheetId(itemId)
      void loadCostSheet(itemId)
    }
  }

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
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Ledger</h1>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
              <LogoutIcon />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['parties', 'items'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '11px 0', borderRadius: 10,
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
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehavior: 'contain',
        padding: '16px 16px 24px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Loading…</div>
        ) : tab === 'parties' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ledgers.length === 0 && (
              <p style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: 24 }}>No parties yet.</p>
            )}
            {ledgers.map(l => (
              <div key={l.id} style={{
                background: '#1A1D27', borderRadius: 14,
                border: editingPartyId === l.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.07)',
                overflow: 'hidden', transition: 'border-color 0.15s',
              }}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <span style={{ background: typeColors[l.type]?.bg, color: typeColors[l.type]?.color, fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px', textTransform: 'capitalize', marginRight: 4 }}>
                      {l.type}
                    </span>
                    <button onClick={() => editingPartyId === l.id ? setEditingPartyId(null) : (setEditingPartyId(l.id), setEditPartyForm({ name: l.name, vat_no: l.vat_no ?? '', pan_no: l.pan_no ?? '', type: l.type }))}
                      style={{ ...iconBtn, color: editingPartyId === l.id ? '#F59E0B' : '#475569' }}><PencilIcon /></button>
                    <button onClick={() => setPendingDeleteParty(l)} style={{ ...iconBtn, color: '#374151' }}><TrashIcon /></button>
                  </div>
                </div>
                {editingPartyId === l.id && (
                  <form onSubmit={handleSaveParty} style={inlineForm}>
                    <input placeholder="Party name *" value={editPartyForm.name} onChange={e => setEditPartyForm(f => ({ ...f, name: e.target.value }))} style={inp} required autoFocus />
                    <input placeholder="VAT No" value={editPartyForm.vat_no} onChange={e => setEditPartyForm(f => ({ ...f, vat_no: e.target.value }))} style={inp} />
                    <input placeholder="PAN No" value={editPartyForm.pan_no} onChange={e => setEditPartyForm(f => ({ ...f, pan_no: e.target.value }))} style={inp} />
                    <select value={editPartyForm.type} onChange={e => setEditPartyForm(f => ({ ...f, type: e.target.value as Ledger['type'] }))} style={inp}>
                      <option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option>
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button type="button" onClick={() => setEditingPartyId(null)} style={cancelBtn}>Cancel</button>
                      <button type="submit" disabled={savingParty} style={saveAmberBtn}>{savingParty ? 'Saving…' : 'Save'}</button>
                    </div>
                  </form>
                )}
              </div>
            ))}

            {!showPartyForm ? (
              <button onClick={() => setShowPartyForm(true)} style={addBtn}>+ Add Party</button>
            ) : (
              <form onSubmit={handleAddParty} style={addForm}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginBottom: 12 }}>New Party</p>
                <input placeholder="Party name *" value={partyForm.name} onChange={e => setPartyForm(f => ({ ...f, name: e.target.value }))} style={inp} required />
                <input placeholder="VAT No (optional)" value={partyForm.vat_no} onChange={e => setPartyForm(f => ({ ...f, vat_no: e.target.value }))} style={inp} />
                <input placeholder="PAN No (optional)" value={partyForm.pan_no} onChange={e => setPartyForm(f => ({ ...f, pan_no: e.target.value }))} style={inp} />
                <select value={partyForm.type} onChange={e => setPartyForm(f => ({ ...f, type: e.target.value as Ledger['type'] }))} style={inp}>
                  <option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option>
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button" onClick={() => setShowPartyForm(false)} style={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={addingParty} style={saveDarkBtn}>{addingParty ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.length === 0 && (
              <p style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: 24 }}>No items yet.</p>
            )}
            {items.map(item => (
              <div key={item.id} style={{
                background: '#1A1D27', borderRadius: 14,
                border: editingItemId === item.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.07)',
                overflow: 'hidden', transition: 'border-color 0.15s',
              }}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#10B981', flexShrink: 0, marginTop: 2 }}>
                    {item.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>{item.name}</p>
                    <button
                      type="button"
                      onClick={() => toggleCostSheet(item.id)}
                      style={{
                        background: 'none', border: 'none',
                        color: openCostSheetId === item.id ? '#F59E0B' : '#475569',
                        fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', padding: '4px 0',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <CostSheetIcon />
                      Cost sheet
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ background: 'rgba(255,255,255,0.07)', color: '#94A3B8', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '3px 8px' }}>{item.default_unit}</span>
                    <button onClick={() => editingItemId === item.id ? setEditingItemId(null) : (setEditingItemId(item.id), setEditItemForm({ name: item.name, default_unit: item.default_unit }))}
                      style={{ ...iconBtn, color: editingItemId === item.id ? '#F59E0B' : '#475569' }}><PencilIcon /></button>
                    <button onClick={() => setPendingDeleteItem(item)} style={{ ...iconBtn, color: '#374151' }}><TrashIcon /></button>
                  </div>
                </div>
                {openCostSheetId === item.id && (
                  <div style={{
                    borderTop: '3px solid #F59E0B',
                    background: '#0F1117',
                    padding: '16px',
                  }}>
                    <p style={{
                      fontSize: 12, color: '#475569',
                      marginBottom: 12, fontWeight: 500,
                    }}>
                      Cost breakdown per {item.default_unit}
                    </p>

                    {(costRows[item.id] ?? []).map(cost => (
                      <div key={cost.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <span style={{ fontSize: 13, color: '#94A3B8' }}>{cost.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="font-mono-numbers" style={{
                            fontSize: 13, color: '#F1F5F9', fontWeight: 600,
                          }}>
                            रू {cost.amount.toFixed(2)}
                          </span>
                          <button type="button" onClick={() => void deleteCostRow(cost.id, item.id)}
                            style={{
                              color: '#F43F5E', background: 'none', border: 'none',
                              cursor: 'pointer', fontSize: 16, padding: '4px', lineHeight: 1,
                            }}>
                            ×
                          </button>
                        </div>
                      </div>
                    ))}

                    {(costRows[item.id] ?? []).length > 0 && (
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0 8px',
                        borderTop: '1px solid rgba(245,158,11,0.3)',
                        marginTop: 4,
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>
                          Landed cost
                        </span>
                        <span className="font-mono-numbers" style={{
                          fontSize: 18, fontWeight: 700, color: '#F59E0B',
                        }}>
                          रू {(costRows[item.id] ?? []).reduce((s, c) => s + c.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                        Add cost component
                      </p>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {(['Ex factory', 'Bhada', 'Load/unload', 'VAT', 'Delivery', 'Other'] as const).map(chip => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setNewCostLabel(chip)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 20,
                              border: '1px solid rgba(245,158,11,0.3)',
                              background: newCostLabel === chip
                                ? 'rgba(245,158,11,0.2)' : 'transparent',
                              color: newCostLabel === chip ? '#F59E0B' : '#475569',
                              fontSize: 11, cursor: 'pointer', fontWeight: 500,
                            }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <input
                          placeholder="Label (e.g. Bhada)"
                          value={newCostLabel}
                          onChange={e => setNewCostLabel(e.target.value)}
                          style={inp}
                        />
                        <input
                          type="number"
                          placeholder="Amount"
                          value={newCostAmount}
                          onChange={e => setNewCostAmount(e.target.value)}
                          className="font-mono-numbers"
                          style={{ ...inp, fontFamily: 'var(--font-dm-mono)' }}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void addCostRow(item.id)}
                        style={{
                          width: '100%', marginTop: 8,
                          padding: '10px 0',
                          background: '#F59E0B', color: '#111827',
                          border: 'none', borderRadius: 10,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        + Add component
                      </button>
                    </div>
                  </div>
                )}
                {editingItemId === item.id && (
                  <form onSubmit={handleSaveItem} style={inlineForm}>
                    <input placeholder="Item name *" value={editItemForm.name} onChange={e => setEditItemForm(f => ({ ...f, name: e.target.value }))} style={inp} required autoFocus />
                    <input placeholder="Unit (CTN, BAG, KG…) *" value={editItemForm.default_unit} onChange={e => setEditItemForm(f => ({ ...f, default_unit: e.target.value }))} style={inp} required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button type="button" onClick={() => setEditingItemId(null)} style={cancelBtn}>Cancel</button>
                      <button type="submit" disabled={savingItem} style={saveAmberBtn}>{savingItem ? 'Saving…' : 'Save'}</button>
                    </div>
                  </form>
                )}
              </div>
            ))}

            {!showItemForm ? (
              <button onClick={() => setShowItemForm(true)} style={addBtn}>+ Add Item</button>
            ) : (
              <form onSubmit={handleAddItem} style={addForm}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginBottom: 12 }}>New Item</p>
                <input placeholder="Item name *" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} style={inp} required />
                <input placeholder="Default unit (CTN, BAG, KG…) *" value={itemForm.default_unit} onChange={e => setItemForm(f => ({ ...f, default_unit: e.target.value }))} style={inp} required />
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

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function CostSheetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function PencilIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
}

const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', background: '#0F1117', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 16, boxSizing: 'border-box', outline: 'none' }
const inlineForm: React.CSSProperties = { borderTop: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
const addForm: React.CSSProperties = { background: '#1A1D27', borderRadius: 14, padding: 16, border: '1px solid rgba(245,158,11,0.2)', borderTop: '3px solid #F59E0B', display: 'flex', flexDirection: 'column', gap: 10 }
const addBtn: React.CSSProperties = { width: '100%', padding: '14px 0', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const cancelBtn: React.CSSProperties = { padding: '11px 0', background: 'rgba(255,255,255,0.07)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const saveAmberBtn: React.CSSProperties = { padding: '11px 0', background: '#F59E0B', color: '#111827', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const saveDarkBtn: React.CSSProperties = { padding: '11px 0', background: '#1E293B', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, minHeight: 36 }
