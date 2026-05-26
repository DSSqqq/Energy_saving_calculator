import { Building, BuildingType, BUILDING_TYPE_LABELS, BUILDING_TYPE_PRESETS } from './types'

type BuildingsListProps = {
  buildings: Building[]
  onChange: (buildings: Building[]) => void
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (val: number) => void
}) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </label>
  )
}

export function BuildingsList({ buildings, onChange }: BuildingsListProps) {
  const update = (idx: number, updates: Partial<Building>) => {
    const copy = [...buildings]
    copy[idx] = { ...copy[idx], ...updates }
    onChange(copy)
  }

  const changeType = (idx: number, type: BuildingType) => {
    const preset = BUILDING_TYPE_PRESETS[type]
    update(idx, { type, ...preset })
  }

  const add = () => {
    const preset = BUILDING_TYPE_PRESETS['other']
    onChange([
      ...buildings,
      {
        name: `Здание ${buildings.length + 1}`,
        type: 'other',
        area_m2: 100,
        r_before: 0.8,
        r_after: 3.3,
        t_inside: 20,
        ...preset,
      },
    ])
  }

  const remove = (idx: number) => {
    if (buildings.length > 1) {
      onChange(buildings.filter((_, i) => i !== idx))
    }
  }

  return (
    <div className="buildings-list">
      <h3>Параметры зданий (Стены)</h3>
      {buildings.map((b, idx) => (
        <div key={idx} className="card building-card">
          <div className="building-card__header">
            <div className="building-card__title-row">
              <label className="field-group">
                <span>Название</span>
                <input
                  type="text"
                  value={b.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                />
              </label>
              <label className="field-group">
                <span>Тип</span>
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
                label="Площадь стен, м²"
                value={b.area_m2}
                onChange={(v) => update(idx, { area_m2: v })}
              />
              <NumberField
                label="R до, м²·°С/Вт"
                value={b.r_before}
                onChange={(v) => update(idx, { r_before: v })}
              />
              <NumberField
                label="R после, м²·°С/Вт"
                value={b.r_after}
                onChange={(v) => update(idx, { r_after: v })}
              />
            </div>
            
            <details>
              <summary>Дополнительные параметры</summary>
              <div className="grid" style={{ marginTop: '1rem' }}>
                <NumberField
                  label="Отопительный период, сут."
                  value={b.period_days}
                  onChange={(v) => update(idx, { period_days: v })}
                />
                <NumberField
                  label="t внутри, °С"
                  value={b.t_inside}
                  onChange={(v) => update(idx, { t_inside: v })}
                />
                <NumberField
                  label="t наружная (ср.), °С"
                  value={b.t_outside_avg}
                  onChange={(v) => update(idx, { t_outside_avg: v })}
                />
              </div>
            </details>
          </div>
        </div>
      ))}
      <button type="button" className="btn" onClick={add}>
        + Добавить здание
      </button>
    </div>
  )
}
