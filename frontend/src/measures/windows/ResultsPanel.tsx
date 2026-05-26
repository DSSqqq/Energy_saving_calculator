/**
 * Панель результатов: сводка по зданиям, итоги, экономика проекта.
 * Числа форматируются в локали ru-RU (см. format.ts).
 */
import type { CalculateResponse } from './types'
import { fmtMoney, fmtNumber, fmtPercent } from './format'

type Props = { result: CalculateResponse }

export function ResultsPanel({ result }: Props) {
  const f = result.finance
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
              <th>L, м.п.</th>
              <th>Q_т, Гкал</th>
              <th>Q_inf, Гкал</th>
              <th>Q итого, Гкал</th>
              <th>Экономия, тг</th>
            </tr>
          </thead>
          <tbody>
            {result.buildings.map((b) => (
              <tr key={b.name}>
                <td>{b.name}</td>
                <td>{fmtNumber(b.area_m2)}</td>
                <td>{fmtNumber(b.q_transmission_gcal)}</td>
                <td>{fmtNumber(b.q_infiltration_gcal)}</td>
                <td>{fmtNumber(b.q_total_gcal)}</td>
                <td>{fmtMoney(b.money_savings_tg)}</td>
              </tr>
            ))}
            <tr className="results-table__total">
              <td>ИТОГО</td>
              <td>{fmtNumber(result.totals.area_m2)}</td>
              <td colSpan={2} />
              <td>{fmtNumber(result.totals.q_total_gcal)}</td>
              <td>{fmtMoney(result.totals.money_savings_tg)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Экономика проекта</h3>
      <ul className="kpis">
        <li>
          <strong>Объём газа:</strong> {fmtNumber(result.totals.gas_thousand_m3, 3)} тыс. м³
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
          {Number.isFinite(f.pbp_years) ? `${fmtNumber(f.pbp_years)} лет` : 'не окупается'}
        </li>
        <li>
          <strong>DPBP:</strong>{' '}
          {Number.isFinite(f.dpbp_years) ? `${fmtNumber(f.dpbp_years)} лет` : 'не окупается'}
        </li>
      </ul>
    </section>
  )
}
