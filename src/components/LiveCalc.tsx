import { formatNPR } from '@/lib/format'

interface LiveCalcProps {
  qty: number
  rate: number
  vatPct: number
}

export default function LiveCalc({ qty, rate, vatPct }: LiveCalcProps) {
  const taxable = qty * rate
  const vat = taxable * vatPct / 100
  const total = taxable + vat

  return (
    <div style={{
      background: '#1A1D27',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)',
      borderTop: '3px solid #F59E0B',
      overflow: 'hidden',
      marginTop: 4,
    }}>
      <div style={{ padding: '14px 16px' }}>
        {[
          { label: 'Taxable amount', value: formatNPR(taxable) },
          { label: `VAT (${vatPct}%)`, value: formatNPR(vat) },
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, color: '#475569' }}>{row.label}</span>
            <span className="font-mono-numbers" style={{ fontSize: 13, color: '#94A3B8' }}>{row.value}</span>
          </div>
        ))}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 10, marginTop: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>Total</span>
          <span className="font-mono-numbers" style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>
            {formatNPR(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
