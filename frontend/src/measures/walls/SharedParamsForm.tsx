/**
 * Форма общих параметров для мероприятия «Стены».
 * Поддерживает динамический выбор источника теплоснабжения и автозаполнение его параметров.
 */
import type { SharedParams, FinanceParams, FuelType } from './types'

type Props = {
  shared: SharedParams
  finance: FinanceParams
  onSharedChange: (next: SharedParams) => void
  onFinanceChange: (next: FinanceParams) => void
}

export const FUEL_META: Record<
  FuelType,
  {
    label: string
    fuelUnit: string
    tariffUnit: string
    cvUnit: string
    defaultCV: number
    defaultTariff: number
  }
> = {
  gcal: {
    label: 'Центральное отопление / теплосеть',
    fuelUnit: 'Гкал',
    tariffUnit: 'тг/Гкал',
    cvUnit: 'Гкал/Гкал',
    defaultCV: 1.0,
    defaultTariff: 6761.45,
  },
  gas: {
    label: 'Природный газ',
    fuelUnit: 'тыс. м³',
    tariffUnit: 'тг/м³',
    cvUnit: 'Гкал/тыс. м³',
    defaultCV: 8.19,
    defaultTariff: 49.90,
  },
  electricity: {
    label: 'Электрическая энергия',
    fuelUnit: 'тыс. кВт·ч',
    tariffUnit: 'тг/кВт·ч',
    cvUnit: 'Гкал/тыс. кВт·ч',
    defaultCV: 0.8604,
    defaultTariff: 25.00,
  },
  coal: {
    label: 'Каменный уголь',
    fuelUnit: 'тонн',
    tariffUnit: 'тг/тонна',
    cvUnit: 'Гкал/тонна',
    defaultCV: 5.4,
    defaultTariff: 18000,
  },
  diesel: {
    label: 'Дизельное топливо',
    fuelUnit: 'тонн',
    tariffUnit: 'тг/тонна',
    cvUnit: 'Гкал/тонна',
    defaultCV: 10.1,
    defaultTariff: 280000,
  },
}

export function SharedParamsForm({ shared, finance, onSharedChange, onFinanceChange }: Props) {
  function patchShared<K extends keyof SharedParams>(key: K, value: SharedParams[K]) {
    onSharedChange({ ...shared, [key]: value })
  }

  function patchFinance<K extends keyof FinanceParams>(key: K, value: FinanceParams[K]) {
    onFinanceChange({ ...finance, [key]: value })
  }

  function changeFuelType(newType: FuelType) {
    const meta = FUEL_META[newType]
    onSharedChange({
      ...shared,
      fuel_type: newType,
      fuel_tariff: meta.defaultTariff,
      fuel_calorific: meta.defaultCV,
    })
  }

  const currentMeta = FUEL_META[shared.fuel_type]

  return (
    <section className="block">
      <header className="block__header">
        <h2><span className="title-icon">⚙️</span>Общие параметры расчёта</h2>
      </header>
      <div className="grid">
        <label className="field">
          <span>Источник теплоснабжения / вид топлива</span>
          <select
            value={shared.fuel_type}
            onChange={(e) => changeFuelType(e.target.value as FuelType)}
          >
            {(Object.keys(FUEL_META) as FuelType[]).map((type) => (
              <option key={type} value={type}>
                {FUEL_META[type].label}
              </option>
            ))}
          </select>
        </label>

        <Field
          label={`Тариф на теплоснабжение (${currentMeta.tariffUnit})`}
          value={shared.fuel_tariff}
          onChange={(v) => patchShared('fuel_tariff', v)}
          step={0.01}
        />

        {shared.fuel_type !== 'gcal' && (
          <Field
            label={`Теплотворная способность (${currentMeta.cvUnit})`}
            value={shared.fuel_calorific}
            onChange={(v) => patchShared('fuel_calorific', v)}
            step={0.0001}
          />
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
