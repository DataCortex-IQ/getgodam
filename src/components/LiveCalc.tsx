import { formatNPR } from '@/lib/format'

interface LiveCalcProps {
  qty: number
  rate: number
  vatPct: number
}

export default function LiveCalc({ qty, rate, vatPct }: LiveCalcProps) {
  const taxable = qty * rate
  const vat = taxable * (vatPct / 100)
  const total = taxable + vat

  return (
    <div style={{
      background: '#111827',
      borderRadius: 12,
      padding: '14px 16px',
      marginTop: 4
    }}>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Live Calculation
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Taxable Amount</span>
          <span className="font-mono-numbers" style={{ fontSize: 14, color: '#E5E7EB', fontWeight: 600 }}>
            {formatNPR(taxable)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>VAT ({vatPct}%)</span>
          <span className="font-mono-numbers" style={{ fontSize: 14, color: '#E5E7EB', fontWeight: 600 }}>
            {formatNPR(vat)}
          </span>
        </div>
        <div style={{ height: 1, background: '#374151', margin: '2px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 600 }}>Total</span>
          <span className="font-mono-numbers" style={{ fontSize: 18, color: '#F59E0B', fontWeight: 700 }}>
            {formatNPR(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
