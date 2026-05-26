/**
 * Панель результатов: сводка по зданиям, итоги, экономика проекта.
 * Числа форматируются в локали ru-RU (см. format.ts).
 */
import type { CalculateResponse } from './types'
import { fmtMoney, fmtNumber, fmtPercent } from './format'

type Props = { result: CalculateResponse }

export function ResultsPanel({ result }: Props) {
  const f = result.finance
  const firstFuel = result.buildings[0]?.fuel_type
  const allSameFuel = result.buildings.every((b) => b.fuel_type === firstFuel)

  return (
    <section className="block panel--ok" aria-live="polite">
      <header className="block__header">
        <h2><span className="title-icon">📈</span>Результаты</h2>
      </header>

      <h3>По зданиям</h3>
      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>Здание</th>
              <th>S стен, м²</th>
              <th>Отопление</th>
              <th>Теплопотери до, кВт·ч</th>
              <th>Теплопотери после, кВт·ч</th>
              <th>Экономия тепла, Гкал</th>
              <th>Экономия топлива</th>
              <th>Экономия, тг</th>
            </tr>
          </thead>
          <tbody>
            {result.buildings.map((b) => (
              <tr key={b.name}>
                <td>{b.name}</td>
                <td>{fmtNumber(b.area_m2)}</td>
                <td style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                  {b.fuel_type === 'gas'
                    ? 'Газ'
                    : b.fuel_type === 'electricity'
                    ? 'Электричество'
                    : b.fuel_type === 'coal'
                    ? 'Уголь'
                    : b.fuel_type === 'diesel'
                    ? 'Дизель'
                    : 'Теплосеть'}
                </td>
                <td>{fmtNumber(b.q1_kwh, 0)}</td>
                <td>{fmtNumber(b.q2_kwh, 0)}</td>
                <td>{fmtNumber(b.q_total_gcal, 3)}</td>
                <td>
                  {fmtNumber(b.fuel_savings, 2)} {b.fuel_unit}
                </td>
                <td>{fmtMoney(b.money_savings_tg)}</td>
              </tr>
            ))}
            <tr className="results-table__total">
              <td>ИТОГО</td>
              <td>{fmtNumber(result.totals.area_m2)}</td>
              <td />
              <td colSpan={2} />
              <td>{fmtNumber(result.totals.q_total_gcal, 3)}</td>
              <td>
                {allSameFuel
                  ? `${fmtNumber(result.totals.fuel_savings, 2)} ${result.totals.fuel_unit}`
                  : 'Смешанный'}
              </td>
              <td>{fmtMoney(result.totals.money_savings_tg)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Экономика проекта</h3>
      <ul className="kpis">
        <li>
          <strong>Экономия энергоносителя:</strong>{' '}
          {allSameFuel
            ? `${fmtNumber(result.totals.fuel_savings, 3)} ${result.totals.fuel_unit}`
            : 'Смешанный (см. таблицу выше)'}
        </li>
        <li>
          <strong>Инвестиции:</strong> {fmtMoney(result.investment.total_tg)} тг
        </li>
        <li>
          <strong>NPV:</strong> {fmtMoney(f.npv_tg)} тг
        </li>
        <li>
          <strong>IRR:</strong> {f.irr === null ? '—' : fmtPercent(f.irr)}
        </li>
        <li>
          <strong>DPI:</strong> {fmtNumber(f.dpi)}
        </li>
        <li>
          <strong>PBP:</strong>{' '}
          {f.pbp_years === null ? 'не окупается' : `${fmtNumber(f.pbp_years)} лет`}
        </li>
        <li>
          <strong>DPBP:</strong>{' '}
          {f.dpbp_years === null ? 'не окупается' : `${fmtNumber(f.dpbp_years)} лет`}
        </li>
      </ul>
    </section>
  )
}
