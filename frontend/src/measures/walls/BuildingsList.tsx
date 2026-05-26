/**
 * Список зданий для мероприятия «Стены».
 * Отличие от «Окна»: нет полей инфильтрации (g_inf).
 * area_m2 — площадь наружных стен (м²).
 */
import {
  BUILDING_TYPE_LABELS,
  BUILDING_TYPE_PRESETS,
  type Building,
  type BuildingType,
} from './types'
import { emptyBuilding } from './defaults'

type Props = {
  buildings: Building[]
  onChange: (next: Building[]) => void
}

export function BuildingsList({ buildings, onChange }: Props) {
  function update(idx: number, patch: Partial<Building>) {
    onChange(buildings.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  }

  function changeType(idx: number, type: BuildingType) {
    const preset = BUILDING_TYPE_PRESETS[type]
    update(idx, { type, period_days: preset.period_days, t_outside_avg: preset.t_outside_avg })
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
        {buildings.map((b, idx) => (
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
                label="Площадь наружных стен, м²"
                value={b.area_m2}
                onChange={(v) => update(idx, { area_m2: v })}
                step={0.1}
                min={0.01}
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
                label="R до, м²·°C/Вт"
                value={b.r_before}
                onChange={(v) => update(idx, { r_before: v })}
                step={0.01}
                min={0.01}
              />
              <NumberField
                label="R после, м²·°C/Вт"
                value={b.r_after}
                onChange={(v) => update(idx, { r_after: v })}
                step={0.01}
                min={0.01}
              />
            </div>
          </article>
        ))}
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
