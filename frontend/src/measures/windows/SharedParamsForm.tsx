/** Форма общих параметров: внутренняя температура, c, k, теплотворность, тариф. */
import type { SharedParams, FinanceParams } from './types'

type Props = {
  shared: SharedParams
  finance: FinanceParams
  onSharedChange: (next: SharedParams) => void
  onFinanceChange: (next: FinanceParams) => void
}

export function SharedParamsForm({ shared, finance, onSharedChange, onFinanceChange }: Props) {
  function patch<T extends object>(prev: T, key: keyof T, value: number): T {
    return { ...prev, [key]: value }
  }
  return (
    <section className="block">
      <header className="block__header">
        <h2>Общие параметры расчёта</h2>
      </header>
      <div className="grid">
        <Field
          label="Внутр. температура t_в, °C"
          value={shared.t_inside}
          onChange={(v) => onSharedChange(patch(shared, 't_inside', v))}
          step={0.1}
        />
        <Field
          label="Удельная теплоёмкость c, ккал/(кг·°С)"
          value={shared.c_air}
          onChange={(v) => onSharedChange(patch(shared, 'c_air', v))}
          step={0.01}
        />
        <Field
          label="Коэф. встречного потока k"
          value={shared.k_factor}
          onChange={(v) => onSharedChange(patch(shared, 'k_factor', v))}
          step={0.01}
        />
        <Field
          label="Теплотворная способность газа, Гкал/тыс.м³"
          value={shared.gas_calorific_gcal_per_thousand_m3}
          onChange={(v) =>
            onSharedChange(patch(shared, 'gas_calorific_gcal_per_thousand_m3', v))
          }
          step={0.01}
        />
        <Field
          label="Тариф (тг/м³ газа)"
          value={shared.tariff_tg_per_m3}
          onChange={(v) => onSharedChange(patch(shared, 'tariff_tg_per_m3', v))}
          step={0.01}
        />
        <Field
          label="Ставка дисконтирования (доля, не %)"
          value={finance.discount_rate}
          onChange={(v) => onFinanceChange(patch(finance, 'discount_rate', v))}
          step={0.01}
          min={0}
          max={1}
        />
        <Field
          label="Горизонт NPV, лет"
          value={finance.horizon_years}
          onChange={(v) => onFinanceChange(patch(finance, 'horizon_years', v))}
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
