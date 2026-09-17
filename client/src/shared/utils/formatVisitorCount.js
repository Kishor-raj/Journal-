export function formatVisitorCount(value) {
  if (value === null || value === undefined) return null

  const num = Number(value)
  if (Number.isNaN(num)) return null

  if (num < 1_000) return String(num)

  if (num < 1_000_000) {
    const k = num / 1_000
    return stripTrailingZero(k.toFixed(1)) + 'K'
  }

  const m = num / 1_000_000
  return stripTrailingZero(m.toFixed(1)) + 'M'
}

function stripTrailingZero(formatted) {
  return formatted.replace(/\.0$/, '')
}