interface MetricCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  size?: 'sm' | 'md'
}

export default function MetricCard({ label, value, sub, trend, size = 'md' }: MetricCardProps) {
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#F43F5E' : '#F59E0B'
  return (
    <div style={{
      background: '#1A1D27',
      borderRadius: 14,
      padding: size === 'sm' ? '12px 14px' : '16px',
      border: '1px solid rgba(255,255,255,0.07)',
      minWidth: 0,
      flex: 1,
    }}>
      <p style={{
        fontSize: 11, color: '#475569',
        marginBottom: 6, fontWeight: 500,
        letterSpacing: '0.02em',
      }}>
        {label}
      </p>
      <p className="font-mono-numbers" style={{
        fontSize: size === 'sm' ? 15 : 18,
        fontWeight: 700,
        color: trend ? trendColor : '#F1F5F9',
        lineHeight: 1.2,
        wordBreak: 'break-all',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{sub}</p>
      )}
    </div>
  )
}
