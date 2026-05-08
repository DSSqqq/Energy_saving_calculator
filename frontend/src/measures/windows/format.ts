/** Локализованное форматирование чисел для UI (ru-RU). */

export function fmtNumber(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function fmtMoney(value: number | null | undefined): string {
  return fmtNumber(value, 0)
}

export function fmtPercent(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${fmtNumber(value * 100, fractionDigits)}%`
}
