export function formatDate(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function matchTone(score = 0) {
  if (score >= 70) return 'good'
  if (score >= 50) return 'ok'
  return 'low'
}
