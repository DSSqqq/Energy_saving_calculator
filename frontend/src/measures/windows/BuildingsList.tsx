/**
 * Динамический список зданий с переключением «тип» (пресет периода/температуры),
 * редактируемыми полями и кнопками добавить/удалить.
 * Добавлен индивидуальный выбор источника отопления и тарифа на каждое здание.
 */
import {
  BUILDING_TYPE_LABELS,
  BUILDING_TYPE_PRESETS,
  type Building,
  type BuildingType,
  type FuelType,
} from './types'
import { emptyBuilding } from './defaults'

type Props = {
  buildings: Building[]
  onChange: (next: Building[]) => void
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

export function BuildingsList({ buildings, onChange }: Props) {
  function update(idx: number, patch: Partial<Building>) {
    onChange(buildings.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  }

  function changeType(idx: number, type: BuildingType) {
    const preset = BUILDING_TYPE_PRESETS[type]
    update(idx, { type, period_days: preset.period_days, t_outside_avg: preset.t_outside_avg })
  }

  function changeFuelType(idx: number, fuel_type: FuelType) {
    const meta = FUEL_META[fuel_type]
    update(idx, {
      fuel_type,
      fuel_tariff: meta.defaultTariff,
      fuel_calorific: meta.defaultCV,
    })
  }

  function add() {
    onChange([...buildings, emptyBuilding()])
  }

  function remove(idx: number) {
    onChange(buildings.filter((_, i) => i !== idx))
  }

  return (
    <section className="block">
      <header className="block__header">
        <h2><span className="title-icon">🏢</span>Здания</h2>
        <button type="button" className="btn btn--ghost" onClick={add}>
          + Добавить здание
        </button>
      </header>
      <div className="buildings">
        {buildings.map((b, idx) => {
          const currentMeta = FUEL_META[b.fuel_type]
          return (
            <article key={idx} className="building">
              <div className="building__top">
                <label className="field">
                  <span>Наименование</span>
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Тип здания</span>
                  <select
                    value={b.type}
                    onChange={(e) => changeType(idx, e.target.value as BuildingType)}
                  >
                    {(Object.keys(BUILDING_TYPE_LABELS) as BuildingType[]).map((t) => (
                      <option key={t} value={t}>
                        {BUILDING_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => {
                    if (window.confirm('Вы уверены, что хотите удалить это здание?')) {
                      remove(idx)
                    }
                  }}
                  disabled={buildings.length === 1}
                  title={buildings.length === 1 ? 'Нужно хотя бы одно здание' : 'Удалить'}
                >
                  Удалить
                </button>
              </div>
              <div className="grid">
                <NumberField
                  label="Длина проблемных участков, м.п."
                  value={b.area_m2}
                  onChange={(v) => update(idx, { area_m2: v })}
                  step={0.01}
                  min={0}
                />
                <NumberField
                  label="Отопит. период, сут."
                  value={b.period_days}
                  onChange={(v) => update(idx, { period_days: v })}
                  min={1}
                  max={365}
                />
                <NumberField
                  label="Средняя t наружного воздуха, °C"
                  value={b.t_outside_avg}
                  onChange={(v) => update(idx, { t_outside_avg: v })}
                  step={0.1}
                />
                <NumberField
                  label="Внутренняя t, °C"
                  value={b.t_inside}
                  onChange={(v) => update(idx, { t_inside: v })}
                  step={0.1}
                />
                <NumberField
                  label="R до, м.п.·°C/Вт"
                  value={b.r_before}
                  onChange={(v) => update(idx, { r_before: v })}
                  step={0.01}
                  min={0.01}
                />
                <NumberField
                  label="R после, м.п.·°C/Вт"
                  value={b.r_after}
                  onChange={(v) => update(idx, { r_after: v })}
                  step={0.01}
                  min={0.01}
                />
                <NumberField
                  label="g_inf до, кг/(м.п.·ч)"
                  value={b.g_inf_before}
                  onChange={(v) => update(idx, { g_inf_before: v })}
                  step={0.1}
                  min={0}
                />
                <NumberField
                  label="g_inf после, кг/(м.п.·ч)"
                  value={b.g_inf_after}
                  onChange={(v) => update(idx, { g_inf_after: v })}
                  step={0.1}
                  min={0}
                />

                {/* Поля индивидуального теплоснабжения */}
                <label className="field">
                  <span>Отопление / топливо</span>
                  <select
                    value={b.fuel_type}
                    onChange={(e) => changeFuelType(idx, e.target.value as FuelType)}
                  >
                    {(Object.keys(FUEL_META) as FuelType[]).map((type) => (
                      <option key={type} value={type}>
                        {FUEL_META[type].label}
                      </option>
                    ))}
                  </select>
                </label>
                <NumberField
                  label={`Тариф (${currentMeta.tariffUnit})`}
                  value={b.fuel_tariff}
                  onChange={(v) => update(idx, { fuel_tariff: v })}
                  step={0.01}
                  min={0}
                />
                {b.fuel_type !== 'gcal' ? (
                  <NumberField
                    label={`Теплотворность (${currentMeta.cvUnit})`}
                    value={b.fuel_calorific}
                    onChange={(v) => update(idx, { fuel_calorific: v })}
                    step={0.0001}
                    min={0.0001}
                  />
                ) : (
                  <div className="field-placeholder-empty" style={{ display: 'none' }} />
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function NumberField({
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
