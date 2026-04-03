/** Old behaviour mirrored cash sales/purchases into cash_entries — exclude from manual totals to avoid double count with transactions. */
export function isLegacyTransactionCashMirror(e: { type: string; note?: string | null }) {
  const n = e.note ?? ''
  return (
    (e.type === 'income' && n.startsWith('Sale to ')) ||
    (e.type === 'expense' && n.startsWith('Purchase from '))
  )
}

type CashEntryLike = { type: string; amount: number; note?: string | null }
type CashTxLike = { type: string; total_amount: number }

export function computeCashBalance(cashEntries: CashEntryLike[], cashTransactions: CashTxLike[]) {
  const opening = cashEntries.filter(e => e.type === 'opening').reduce((s, e) => s + e.amount, 0)
  const manualIncome = cashEntries
    .filter(e => e.type === 'income' && !isLegacyTransactionCashMirror(e))
    .reduce((s, e) => s + e.amount, 0)
  const manualExpense = cashEntries
    .filter(e => e.type === 'expense' && !isLegacyTransactionCashMirror(e))
    .reduce((s, e) => s + e.amount, 0)
  const txIncome = cashTransactions.filter(t => t.type === 'sale').reduce((s, t) => s + Number(t.total_amount), 0)
  const txExpense = cashTransactions.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.total_amount), 0)
  return opening + manualIncome + txIncome - manualExpense - txExpense
}
