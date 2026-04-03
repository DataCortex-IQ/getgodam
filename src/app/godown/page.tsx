'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInventory } from '@/lib/inventory'
import { formatNPR } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import StockBadge from '@/components/StockBadge'

interface InventoryItem {
  item_id: string; name: string; unit: string; qty: number
  cost_value: number; avg_rate: number; status: string
}

export default function GodownPage() {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [landedCosts, setLandedCosts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const inv = await getInventory()
        if (cancelled) return
        setInventory(inv)
        const itemIds = inv.map(i => i.item_id).filter(Boolean)
        if (itemIds.length === 0) {
          setLandedCosts({})
          return
        }
        const { data: costs, error } = await supabase
          .from('item_costs')
          .select('item_id, amount')
          .in('item_id', itemIds)
        if (error) {
          console.error(error)
          setLandedCosts({})
          return
        }
        if (cancelled) return
        const map: Record<string, number> = {}
        for (const c of costs ?? []) {
          const id = c.item_id as string
          map[id] = (map[id] ?? 0) + Number(c.amount)
        }
        setLandedCosts(map)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const sorted = [...inventory].sort((a, b) => {
    const o = { good: 0, low: 1, empty: 2 }
    return (o[a.status as keyof typeof o] ?? 0) - (o[b.status as keyof typeof o] ?? 0)
  })

  const totalValue = inventory.reduce((s, i) => s + i.cost_value, 0)
  const inStock = inventory.filter(i => i.qty > 0 && i.status !== 'empty').length
  const lowCount = inventory.filter(i => i.status === 'low').length
  const emptyCount = inventory.filter(i => i.status === 'empty').length
  const qtyColor = { good: '#F1F5F9', low: '#FB923C', empty: '#F43F5E' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* FIXED HEADER */}
      <div style={{
        flexShrink: 0, background: '#0F1117',
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10,
      }}>
        <div style={{ padding: '14px 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Godown</h1>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
              <LogoutIcon />
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: loading || inventory.length === 0 ? 0 : 12 }}>
            {loading ? 'Loading…' : `${inventory.length} items · ${formatNPR(totalValue)} value`}
          </p>
          {/* Status chips */}
          {!loading && inventory.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ ...chipStyle, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>● {inStock} in stock</span>
              {lowCount > 0 && <span style={{ ...chipStyle, background: 'rgba(251,146,60,0.12)', color: '#FB923C' }}>● {lowCount} low</span>}
              {emptyCount > 0 && <span style={{ ...chipStyle, background: 'rgba(244,63,94,0.12)', color: '#F43F5E' }}>● {emptyCount} empty</span>}
            </div>
          )}
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehavior: 'contain',
        padding: '16px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="shimmer" style={{ height: 140, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
          ))
        ) : sorted.length === 0 ? (
          <div style={{ background: '#1A1D27', borderRadius: 16, padding: '40px 24px', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.25 }}>
              <path d="M6 20L24 8l18 12v20a2 2 0 01-2 2H8a2 2 0 01-2-2V20z" stroke="#94A3B8" strokeWidth="2" />
              <rect x="14" y="26" width="8" height="16" rx="1" stroke="#94A3B8" strokeWidth="2" />
              <rect x="24" y="26" width="8" height="10" rx="1" stroke="#94A3B8" strokeWidth="2" />
            </svg>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Godown is empty</p>
            <Link href="/entry" style={{ display: 'inline-block', padding: '10px 20px', background: '#F59E0B', color: '#111827', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Add Purchase →
            </Link>
          </div>
        ) : (
          sorted.map(item => (
            <div key={item.item_id} style={{
              background: '#1A1D27', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden', opacity: item.status === 'empty' ? 0.65 : 1,
            }}>
              <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>{item.name}</p>
                  <StockBadge status={item.status as 'good' | 'low' | 'empty'} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="font-mono-numbers" style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: qtyColor[item.status as keyof typeof qtyColor] ?? '#F1F5F9' }}>
                    {item.qty}
                  </p>
                  <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{item.unit}</p>
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 16px', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>Cost value</p>
                  <p className="font-mono-numbers" style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>{formatNPR(item.cost_value)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>Avg buy rate</p>
                  <p className="font-mono-numbers" style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>{formatNPR(item.avg_rate)}/{item.unit}</p>
                </div>
              </div>
              {(() => {
                const landed = landedCosts[item.item_id]
                if (landed == null || landed <= 0) return null
                const margin = item.avg_rate - landed
                const pct = item.avg_rate > 0 ? (margin / item.avg_rate) * 100 : 0
                return (
                  <div style={{ padding: '0 16px 14px' }}>
                    <p style={{ fontSize: 11, color: '#475569' }}>
                      Landed cost:
                      <span className="font-mono-numbers" style={{ color: '#94A3B8', marginLeft: 4 }}>
                        रू {landed.toFixed(2)}/{item.unit}
                      </span>
                    </p>
                    {item.avg_rate > 0 && (
                      <p style={{
                        fontSize: 12, fontWeight: 600, marginTop: 4,
                        color: item.avg_rate >= landed ? '#10B981' : '#F43F5E',
                      }}>
                        {item.avg_rate >= landed
                          ? `Margin: रू ${margin.toFixed(2)}/${item.unit} (${pct.toFixed(0)}%)`
                          : 'Selling below cost!'}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          ))
        )}
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

const chipStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '4px 12px', display: 'inline-block' }
