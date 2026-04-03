'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getInventory } from '@/lib/inventory'
import { formatNPR } from '@/lib/format'
import StockBadge from '@/components/StockBadge'

interface InventoryItem {
  item_id: string
  name: string
  unit: string
  qty: number
  cost_value: number
  avg_rate: number
  status: string
}

export default function GodownPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInventory()
      .then(data => setInventory(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...inventory].sort((a, b) => {
    const order = { good: 0, low: 1, empty: 2 }
    return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0)
  })

  const totalValue = inventory.reduce((s, i) => s + i.cost_value, 0)
  const inStock = inventory.filter(i => i.qty > 0 && i.status !== 'empty').length
  const lowCount = inventory.filter(i => i.status === 'low').length
  const emptyCount = inventory.filter(i => i.status === 'empty').length

  const qtyColor = { good: '#F1F5F9', low: '#FB923C', empty: '#F43F5E' }

  return (
    <div style={{ background: '#0F1117', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px', background: '#0F1117' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>Godown</h1>
        <p style={{ fontSize: 13, color: '#475569' }}>
          {loading ? 'Loading…' : `${inventory.length} items · ${formatNPR(totalValue)} value`}
        </p>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status chips */}
        {!loading && inventory.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...chipStyle, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
              ● {inStock} in stock
            </span>
            {lowCount > 0 && (
              <span style={{ ...chipStyle, background: 'rgba(251,146,60,0.12)', color: '#FB923C' }}>
                ● {lowCount} low
              </span>
            )}
            {emptyCount > 0 && (
              <span style={{ ...chipStyle, background: 'rgba(244,63,94,0.12)', color: '#F43F5E' }}>
                ● {emptyCount} empty
              </span>
            )}
          </div>
        )}

        {/* Items */}
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="shimmer" style={{
              height: 140, borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
            }} />
          ))
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          sorted.map(item => (
            <div key={item.item_id} style={{
              background: '#1A1D27',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden',
              opacity: item.status === 'empty' ? 0.65 : 1,
            }}>
              {/* Top row */}
              <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>{item.name}</p>
                  <StockBadge status={item.status as 'good' | 'low' | 'empty'} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="font-mono-numbers" style={{
                    fontSize: 40, fontWeight: 800, lineHeight: 1,
                    color: qtyColor[item.status as keyof typeof qtyColor] ?? '#F1F5F9',
                  }}>
                    {item.qty}
                  </p>
                  <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{item.unit}</p>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />

              {/* Bottom stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 16px', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>Cost value</p>
                  <p className="font-mono-numbers" style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>
                    {formatNPR(item.cost_value)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>Avg buy rate</p>
                  <p className="font-mono-numbers" style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>
                    {formatNPR(item.avg_rate)}/{item.unit}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: '#1A1D27',
      borderRadius: 16, padding: '40px 24px',
      border: '1px solid rgba(255,255,255,0.07)',
      textAlign: 'center',
    }}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.25 }}>
        <path d="M6 24L28 8l22 16v24a2 2 0 01-2 2H8a2 2 0 01-2-2V24z" stroke="#94A3B8" strokeWidth="2" />
        <rect x="18" y="32" width="10" height="22" rx="1" stroke="#94A3B8" strokeWidth="2" />
        <rect x="30" y="32" width="10" height="14" rx="1" stroke="#94A3B8" strokeWidth="2" />
        <path d="M22 16h12M22 20h8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </svg>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Your godown is empty</p>
      <p style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>Record a purchase in Entry to add stock</p>
      <Link href="/entry" style={{
        display: 'inline-block', padding: '10px 20px',
        background: '#F59E0B', color: '#111827',
        borderRadius: 10, fontSize: 13, fontWeight: 700,
        textDecoration: 'none',
      }}>
        Add Purchase →
      </Link>
    </div>
  )
}

const chipStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  borderRadius: 20, padding: '5px 12px',
  display: 'inline-block',
}
