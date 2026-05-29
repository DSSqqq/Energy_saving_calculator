import type { CalculateResponse } from './types'
import { fmtMoney, fmtNumber, fmtPercent } from './format'

type Props = { result: CalculateResponse }

export function ResultsPanel({ result }: Props) {
  const f = result.finance

  return (
    <section className="block panel--ok" aria-live="polite">
      <header className="block__header">
        <h2>
          <span className="title-icon">📈</span>Результаты
        </h2>
      </header>

      <h3>По зданиям</h3>
      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>Здание</th>
              <th>Q баз, Гкал</th>
              <th>q₀ max, Гкал/ч</th>
              <th>Qр (раб. день), Гкал</th>
              <th>Qв (дежур.), Гкал</th>
              <th>Qнов, Гкал</th>
              <th>Экономия ΔQ, Гкал</th>
              <th>Экономия, тг</th>
              <th>Затраты, тг</th>
              <th>Окупаемость, лет</th>
            </tr>
          </thead>
          <tbody>
            {result.buildings.map((b) => (
              <tr key={b.name}>
                <td>{b.name}</td>
                <td>{fmtNumber(b.q_annual, 2)}</td>
                <td>{fmtNumber(b.q0_max, 5)}</td>
                <td>{fmtNumber(b.q_p, 2)}</td>
                <td>{fmtNumber(b.q_v, 2)}</td>
                <td>{fmtNumber(b.q_new, 2)}</td>
                <td>{fmtNumber(b.delta_q, 3)}</td>
                <td>{fmtMoney(b.money_savings_tg)}</td>
                <td>{fmtMoney(b.investment)}</td>
                <td>{b.pbp_years === null ? 'не ок.' : `${fmtNumber(b.pbp_years, 2)}`}</td>
              </tr>
            ))}
            <tr className="results-table__total">
              <td>ИТОГО</td>
              <td>{fmtNumber(result.totals.q_base_gcal, 2)}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>{fmtNumber(result.totals.q_new_gcal, 2)}</td>
              <td>{fmtNumber(result.totals.q_total_gcal, 3)}</td>
              <td>{fmtMoney(result.totals.money_savings_tg)}</td>
              <td>{fmtMoney(result.totals.investment_total_tg)}</td>
              <td>{f.pbp_years === null ? 'не ок.' : `${fmtNumber(f.pbp_years, 2)}`}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Экономическая эффективность проекта АТП</h3>
      <ul className="kpis">
        <li>
          <strong>Общая экономия тепловой энергии:</strong> {fmtNumber(result.totals.q_total_gcal, 3)} Гкал/год
        </li>
        <li>
          <strong>Общая экономия в деньгах:</strong> {fmtMoney(result.totals.money_savings_tg)} тг/год
        </li>
        <li>
          <strong>Суммарные инвестиции:</strong> {fmtMoney(result.totals.investment_total_tg)} тг
        </li>
        <li>
          <strong>Чистая приведенная стоимость (NPV):</strong> {fmtMoney(f.npv_tg)} тг
        </li>
        <li>
          <strong>Внутренняя норма доходности (IRR):</strong> {f.irr === null ? '—' : fmtPercent(f.irr)}
        </li>
        <li>
          <strong>Дисконтированный индекс доходности (DPI):</strong> {f.dpi === null ? '—' : fmtNumber(f.dpi)}
        </li>
        <li>
          <strong>Простой срок окупаемости (PBP):</strong>{' '}
          {f.pbp_years === null ? 'не окупается' : `${fmtNumber(f.pbp_years)} лет`}
        </li>
        <li>
          <strong>Дисконтированный срок окупаемости (DPBP):</strong>{' '}
          {f.dpbp_years === null ? 'не окупается' : `${fmtNumber(f.dpbp_years)} лет`}
        </li>
      </ul>
    </section>
  )
}
