import { SharedParams } from './types'

export function SharedParamsForm({
  shared,
  onChange,
}: {
  shared: SharedParams
  onChange: (s: SharedParams) => void
}) {
  const update = (updates: Partial<SharedParams>) => {
    onChange({ ...shared, ...updates })
  }

  return (
    <div className="card">
      <h3>Общие параметры и тарифы</h3>
      <div className="grid">
        <label className="field-group">
          <span>Теплота сгорания газа, Гкал/тыс.м³</span>
          <input
            type="number"
            step="any"
            value={shared.gas_calorific_gcal_per_thousand_m3}
            onChange={(e) =>
              update({ gas_calorific_gcal_per_thousand_m3: parseFloat(e.target.value) || 0 })
            }
          />
        </label>
        <label className="field-group">
          <span>Тариф (тг / 1 м³ газа)</span>
          <input
            type="number"
            step="any"
            value={shared.tariff_tg_per_m3}
            onChange={(e) => update({ tariff_tg_per_m3: parseFloat(e.target.value) || 0 })}
          />
        </label>
      </div>
    </div>
  )
}
