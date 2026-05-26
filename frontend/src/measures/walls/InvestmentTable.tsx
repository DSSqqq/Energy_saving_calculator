/** Редактируемая таблица сметы: материал/количество м²/цена. */
import type { InvestmentItem } from './types'
import { emptyInvestmentItem } from './defaults'

type Props = {
  items: InvestmentItem[]
  onChange: (next: InvestmentItem[]) => void
}

export function InvestmentTable({ items, onChange }: Props) {
  function update(idx: number, patch: Partial<InvestmentItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function add() {
    onChange([...items, emptyInvestmentItem()])
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }
  return (
    <section className="block">
      <header className="block__header">
        <h2><span className="title-icon">💰</span>Смета</h2>
        <button type="button" className="btn btn--ghost" onClick={add}>
          + Добавить строку
        </button>
      </header>
      <table className="invest-table">
        <thead>
          <tr>
            <th>Материал</th>
            <th>Количество, м²</th>
            <th>Цена за ед., тг</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td>
                <input
                  type="text"
                  value={it.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={Number.isFinite(it.quantity) ? it.quantity : ''}
                  onChange={(e) =>
                    update(idx, { quantity: Number(e.target.value) })
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={Number.isFinite(it.price_per_unit) ? it.price_per_unit : ''}
                  onChange={(e) =>
                    update(idx, { price_per_unit: Number(e.target.value) })
                  }
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => {
                    if (window.confirm('Вы уверены, что хотите удалить эту строку из сметы?')) {
                      remove(idx)
                    }
                  }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
