export default function TransactionBadge({ type }: { type: 'purchase' | 'sale' }) {
  const isPurchase = type === 'purchase'
  return (
    <span style={{
      background: isPurchase ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
      color: isPurchase ? '#F59E0B' : '#10B981',
      fontSize: 10, fontWeight: 600,
      borderRadius: 20, padding: '3px 9px',
      display: 'inline-block', letterSpacing: '0.03em',
    }}>
      {isPurchase ? '↓ Purchase' : '↑ Sale'}
    </span>
  )
}
