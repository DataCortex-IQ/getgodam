interface MetricCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export default function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div style={{
      background: accent ? '#111827' : '#FFFFFF',
      borderRadius: 12,
      padding: '14px 16px',
      border: accent ? 'none' : '1px solid #E5E7EB',
      minWidth: 0,
    }}>
      <p style={{
        fontSize: 11,
        color: accent ? '#9CA3AF' : '#6B7280',
        marginBottom: 4,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {label}
      </p>
      <p className="font-mono-numbers" style={{
        fontSize: 18,
        fontWeight: 700,
        color: accent ? '#F59E0B' : '#111827',
        lineHeight: 1.2,
        wordBreak: 'break-all'
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: accent ? '#6B7280' : '#9CA3AF', marginTop: 2 }}>
          {sub}
        </p>
      )}
    </div>
  )
}
