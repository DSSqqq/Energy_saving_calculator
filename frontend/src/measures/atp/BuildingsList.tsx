import { type Building } from './types'
import { emptyBuilding } from './defaults'

type Props = {
  buildings: Building[]
  onChange: (next: Building[]) => void
  mode: 'single' | 'multi'
}

export function BuildingsList({ buildings, onChange, mode }: Props) {
  function update(idx: number, patch: Partial<Building>) {
    onChange(buildings.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
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
        <h2>
          <span className="title-icon">🏢</span>
          {mode === 'single' ? 'Параметры теплового пункта всего объекта' : 'Здания и тепловые нагрузки'}
        </h2>
        {mode === 'multi' && (
          <button type="button" className="btn btn--ghost" onClick={add}>
            + Добавить здание
          </button>
        )}
      </header>
      <div className="buildings">
        {buildings.map((b, idx) => {
          return (
            <article key={idx} className="building">
              <div className="building__top">
                <label className="field">
                  <span>Наименование {mode === 'single' ? 'объекта' : 'здания / объекта'}</span>
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    placeholder={mode === 'single' ? 'Например, Весь объект' : 'Например, АБК'}
                  />
                </label>
                {mode === 'multi' && (
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
                )}
              </div>
              <div className="grid">
                {mode === 'multi' && (
                  <NumberField
                    label="Базовое теплопотребление, Гкал/год"
                    value={b.q_annual}
                    onChange={(v) => update(idx, { q_annual: v })}
                    step={0.01}
                    min={0.01}
                  />
                )}
                <NumberField
                  label="Внутренняя t (рабочая), °C"
                  value={b.t_inside}
                  onChange={(v) => update(idx, { t_inside: v })}
                  step={0.1}
                />
                <NumberField
                  label="Дежурная t (нерабочая), °C"
                  value={b.t_standby}
                  onChange={(v) => update(idx, { t_standby: v })}
                  step={0.1}
                />
                <NumberField
                  label="Средняя t наружная, °C"
                  value={b.t_outside_avg}
                  onChange={(v) => update(idx, { t_outside_avg: v })}
                  step={0.1}
                />
                <NumberField
                  label="Расчетная t наружная (пятидневка), °C"
                  value={b.t_outside_design}
                  onChange={(v) => update(idx, { t_outside_design: v })}
                  step={0.1}
                />
                <NumberField
                  label="Отопит. период, сут."
                  value={b.period_days}
                  onChange={(v) => update(idx, { period_days: v })}
                  min={1}
                  max={365}
                />
                <NumberField
                  label="Выходные дни в периоде, сут."
                  value={b.weekend_days}
                  onChange={(v) => update(idx, { weekend_days: v })}
                  min={0}
                  max={365}
                />
                <NumberField
                  label="Время рабочей t (день), ч"
                  value={b.day_hours}
                  onChange={(v) => update(idx, { day_hours: v })}
                  min={0}
                  max={24}
                  step={1}
                />
                <NumberField
                  label="Тариф теплоснабжения, тг/Гкал"
                  value={b.fuel_tariff}
                  onChange={(v) => update(idx, { fuel_tariff: v })}
                  step={0.01}
                  min={0}
                />
                <NumberField
                  label={mode === 'single' ? 'Затраты на АТП всего объекта, тг' : 'Затраты на АТП для здания, тг'}
                  value={b.investment}
                  onChange={(v) => update(idx, { investment: v })}
                  step={1000}
                  min={0}
                />
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
