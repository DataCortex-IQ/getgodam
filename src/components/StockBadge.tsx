interface StockBadgeProps {
  status: 'good' | 'low' | 'empty'
}

const config = {
  good: { label: 'In Stock', bg: '#D1FAE5', color: '#065F46' },
  low: { label: 'Low Stock', bg: '#FEF3C7', color: '#92400E' },
  empty: { label: 'Empty', bg: '#FEE2E2', color: '#991B1B' },
}

export default function StockBadge({ status }: StockBadgeProps) {
  const c = config[status]
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 20,
      padding: '2px 8px',
      display: 'inline-block',
      letterSpacing: '0.03em'
    }}>
      {c.label}
    </span>
  )
}
