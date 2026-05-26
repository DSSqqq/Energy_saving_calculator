import { CalculateResponse } from './types'

export function ResultsPanel({ results }: { results: CalculateResponse }) {
  const { summary, financials, buildings } = results

  const formatNumber = (num: number, digits: number = 2) =>
    num.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })

  const formatMoney = (num: number) =>
    num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' тг'

  return (
    <div className="results-panel">
      <div className="card results-card highlight">
        <h3>Итоги по всем зданиям</h3>
        <div className="results-grid">
          <div className="result-item">
            <div className="result-label">Суммарная экономия (Гкал)</div>
            <div className="result-value">{formatNumber(summary.total_delta_q_gcal)}</div>
          </div>
          <div className="result-item">
            <div className="result-label">Суммарная экономия (тг)</div>
            <div className="result-value text-success">{formatMoney(summary.total_savings_tg)}</div>
          </div>
          <div className="result-item">
            <div className="result-label">Общие инвестиции</div>
            <div className="result-value text-danger">{formatMoney(summary.total_cost_tg)}</div>
          </div>
        </div>
      </div>

      <div className="card results-card">
        <h3>Экономика проекта</h3>
        <div className="results-grid">
          <div className="result-item">
            <div className="result-label">NPV</div>
            <div className="result-value">{formatMoney(financials.npv)}</div>
          </div>
          <div className="result-item">
            <div className="result-label">IRR</div>
            <div className="result-value">
              {financials.irr !== null ? formatNumber(financials.irr * 100, 1) + '%' : '—'}
            </div>
          </div>
          <div className="result-item">
            <div className="result-label">DPI</div>
            <div className="result-value">{formatNumber(financials.dpi)}</div>
          </div>
          <div className="result-item">
            <div className="result-label">Простой срок окупаемости</div>
            <div className="result-value">{formatNumber(financials.pbp, 1)} лет</div>
          </div>
        </div>
      </div>

      <div className="card results-card">
        <h3>Детализация по зданиям</h3>
        <div className="table-responsive">
          <table className="results-table">
            <thead>
              <tr>
                <th>Здание</th>
                <th>ΔQ (Гкал)</th>
                <th>Экономия (тг)</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((b, i) => (
                <tr key={i}>
                  <td>{b.name}</td>
                  <td>{formatNumber(b.delta_q_gcal)}</td>
                  <td>{formatMoney(b.savings_tg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
