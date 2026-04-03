import { formatNPR } from '@/lib/format'

export type LiveCalcLine = { name: string; taxable: number; vat: number; total: number }

interface LiveCalcProps {
  vatPct: number
  lines: LiveCalcLine[]
  grandTaxable: number
  grandVat: number
  grandTotal: number
}

export default function LiveCalc({ vatPct, lines, grandTaxable, grandVat, grandTotal }: LiveCalcProps) {
  const showPerItem = lines.length > 1

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
        {showPerItem && (
          <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginBottom: 10, letterSpacing: '0.02em' }}>PER ITEM</p>
            {lines.map((line, i) => (
              <div key={i} style={{ marginBottom: i < lines.length - 1 ? 10 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', flex: 1, minWidth: 0 }}>{line.name}</span>
                  <span className="font-mono-numbers" style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
                    {formatNPR(line.total)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
                  <span>Taxable {formatNPR(line.taxable)}</span>
                  <span>VAT {formatNPR(line.vat)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {[
          { label: showPerItem ? 'Taxable (total)' : 'Taxable amount', value: formatNPR(grandTaxable) },
          { label: `VAT (${vatPct}%)${showPerItem ? ' — total' : ''}`, value: formatNPR(grandVat) },
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
            {formatNPR(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
