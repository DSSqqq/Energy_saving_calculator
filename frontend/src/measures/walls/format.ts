/** Форматирование чисел для мероприятия «Стены». */

export function fmtNumber(n: number, digits = 2): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtPercent(n: number): string {
  return (n * 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}
