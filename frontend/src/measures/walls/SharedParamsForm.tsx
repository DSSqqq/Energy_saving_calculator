/**
 * Форма общих параметров для мероприятия «Стены».
 * Отличие от «Окна»: нет c_air, k_factor (инфильтрация не используется).
 * Добавлен выбор базы расчёта тарифа (природный газ или тепловая энергия).
 */
import type { SharedParams, FinanceParams } from './types'

type Props = {
  shared: SharedParams
  finance: FinanceParams
  onSharedChange: (next: SharedParams) => void
  onFinanceChange: (next: FinanceParams) => void
}

export function SharedParamsForm({ shared, finance, onSharedChange, onFinanceChange }: Props) {
  function patchShared<K extends keyof SharedParams>(key: K, value: SharedParams[K]) {
    onSharedChange({ ...shared, [key]: value })
  }

  function patchFinance<K extends keyof FinanceParams>(key: K, value: FinanceParams[K]) {
    onFinanceChange({ ...finance, [key]: value })
  }

  return (
    <section className="block">
      <header className="block__header">
        <h2><span className="title-icon">⚙️</span>Общие параметры расчёта</h2>
      </header>
      <div className="grid">
        <label className="field">
          <span>База расчёта тарифа</span>
          <select
            value={shared.tariff_type}
            onChange={(e) => patchShared('tariff_type', e.target.value as 'gas' | 'gcal')}
          >
            <option value="gcal">Тепловая энергия (тг/Гкал)</option>
            <option value="gas">Природный газ (тг/м³)</option>
          </select>
        </label>

        {shared.tariff_type === 'gas' ? (
          <>
            <Field
              label="Тариф на газ (тг/м³)"
              value={shared.tariff_tg_per_m3}
              onChange={(v) => patchShared('tariff_tg_per_m3', v)}
              step={0.01}
            />
            <Field
              label="Теплотворная способность газа, Гкал/тыс.м³"
              value={shared.gas_calorific_gcal_per_thousand_m3}
              onChange={(v) => patchShared('gas_calorific_gcal_per_thousand_m3', v)}
              step={0.01}
            />
          </>
        ) : (
          <>
            <Field
              label="Тариф на тепловую энергию (тг/Гкал)"
              value={shared.tariff_tg_per_gcal}
              onChange={(v) => patchShared('tariff_tg_per_gcal', v)}
              step={0.01}
            />
            {/* Мы всё еще можем показать теплотворность для перевода в газ */}
            <Field
              label="Теплотворная способность газа, Гкал/тыс.м³"
              value={shared.gas_calorific_gcal_per_thousand_m3}
              onChange={(v) => patchShared('gas_calorific_gcal_per_thousand_m3', v)}
              step={0.01}
            />
          </>
        )}

        <Field
          label="Ставка дисконтирования (доля, не %)"
          value={finance.discount_rate}
          onChange={(v) => patchFinance('discount_rate', v)}
          step={0.01}
          min={0}
          max={1}
        />
        <Field
          label="Горизонт NPV, лет"
          value={finance.horizon_years}
          onChange={(v) => patchFinance('horizon_years', v)}
          step={1}
          min={1}
          max={50}
        />
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step ?? 'any'}
        min={min}
        max={max}
      />
    </label>
  )
}
