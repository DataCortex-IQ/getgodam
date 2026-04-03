interface TransactionBadgeProps {
  type: 'purchase' | 'sale'
}

export default function TransactionBadge({ type }: TransactionBadgeProps) {
  const isPurchase = type === 'purchase'
  return (
    <span style={{
      background: isPurchase ? '#FEF3C7' : '#D1FAE5',
      color: isPurchase ? '#92400E' : '#065F46',
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 20,
      padding: '2px 8px',
      display: 'inline-block',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {isPurchase ? 'Purchase' : 'Sale'}
    </span>
  )
}
