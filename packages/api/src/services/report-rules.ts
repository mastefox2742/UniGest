export function percentage(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

export function average(values: number[]) {
  const valid = values.filter(value => Number.isFinite(value))
  if (valid.length === 0) return 0
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10
}

export function groupCount<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item) || 'Non renseigne'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export function withPercentages(rows: Array<{ label: string; count: number }>) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  return rows.map(row => ({ ...row, pct: percentage(row.count, total) }))
}
