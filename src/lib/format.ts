export function formatNPR(amount: number): string {
  return 'रू ' + Math.round(amount).toLocaleString('en-IN')
}

export function formatNPRCompact(amount: number): string {
  if (amount >= 10_00_000) return 'रू ' + (amount / 10_00_000).toFixed(1) + 'L'
  if (amount >= 1_00_000) return 'रू ' + (amount / 1_00_000).toFixed(1) + 'L'
  if (amount >= 1_000) return 'रू ' + (amount / 1_000).toFixed(1) + 'K'
  return 'रू ' + Math.round(amount).toLocaleString('en-IN')
}
