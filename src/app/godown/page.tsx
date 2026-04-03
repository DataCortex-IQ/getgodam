'use client'
import { useEffect, useState } from 'react'
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

  const totalValue = inventory.reduce((sum, i) => sum + i.cost_value, 0)
  const totalItems = inventory.filter(i => i.qty > 0).length

  return (
    <div>
      {/* Header */}
      <div style={{
        background: '#111827',
        padding: '52px 20px 20px',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>
          Godown
        </h1>
        <p style={{ color: '#6B7280', fontSize: 13 }}>
          {loading ? 'Loading…' : `${totalItems} items in stock · ${formatNPR(totalValue)} value`}
        </p>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading inventory…</div>
        ) : sorted.length === 0 ? (
          <div style={{
            background: '#FFFFFF', borderRadius: 12, padding: 32,
            textAlign: 'center', border: '1px solid #E5E7EB'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: 15 }}>No inventory yet.</p>
            <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Record a purchase in Entry to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(item => (
              <div key={item.item_id} style={{
                background: '#FFFFFF',
                borderRadius: 12,
                padding: '14px 16px',
                border: '1px solid #E5E7EB',
                opacity: item.status === 'empty' ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                      {item.name}
                    </p>
                    <StockBadge status={item.status as 'good' | 'low' | 'empty'} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="font-mono-numbers" style={{
                      fontSize: 28, fontWeight: 800,
                      color: item.status === 'empty' ? '#EF4444' : '#111827',
                      lineHeight: 1
                    }}>
                      {item.qty}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{item.unit}</p>
                  </div>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: 10, marginTop: 12, paddingTop: 12,
                  borderTop: '1px solid #F3F4F6'
                }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Cost Value</p>
                    <p className="font-mono-numbers" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {formatNPR(item.cost_value)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Avg Buy Rate</p>
                    <p className="font-mono-numbers" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {formatNPR(item.avg_rate)}/{item.unit}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
