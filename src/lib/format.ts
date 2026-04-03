export function formatNPR(amount: number): string {
  return '₨ ' + amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0
  })
}
