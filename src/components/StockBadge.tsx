interface StockBadgeProps {
  status: 'good' | 'low' | 'empty'
}

const config = {
  good: { label: 'In stock', bg: 'rgba(16,185,129,0.15)', color: '#10B981', dot: '#10B981' },
  low: { label: 'Low stock', bg: 'rgba(251,146,60,0.15)', color: '#FB923C', dot: '#FB923C' },
  empty: { label: 'Empty', bg: 'rgba(244,63,94,0.15)', color: '#F43F5E', dot: '#F43F5E' },
}

export default function StockBadge({ status }: StockBadgeProps) {
  const c = config[status]
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 600,
      borderRadius: 20, padding: '3px 10px',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: c.dot, display: 'inline-block', flexShrink: 0,
      }} />
      {c.label}
    </span>
  )
}
