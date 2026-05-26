/**
 * Форма общих параметров для мероприятия «Окна».
 * Содержит только глобальные коэффициенты инфильтрации и параметры финансового горизонта.
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
        <Field
          label="Удельная теплоёмкость c, ккал/(кг·°С)"
          value={shared.c_air}
          onChange={(v) => patchShared('c_air', v)}
          step={0.01}
        />
        <Field
          label="Коэф. встречного потока k"
          value={shared.k_factor}
          onChange={(v) => patchShared('k_factor', v)}
          step={0.01}
        />
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
