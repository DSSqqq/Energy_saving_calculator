import { useState } from 'react'
import { BuildingsList } from './BuildingsList'
import { InvestmentTable } from './InvestmentTable'
import { ResultsPanel } from './ResultsPanel'
import { SharedParamsForm } from './SharedParamsForm'
import { DEFAULT_INPUT } from './defaults'
import { CalculateResponse, WallsInput } from './types'
import { API_BASE_URL } from '../../config'

export function WallsMeasure() {
  const [input, setInput] = useState<WallsInput>(DEFAULT_INPUT)
  const [results, setResults] = useState<CalculateResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    setIsCalculating(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/measures/walls/calculate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(JSON.stringify(errData, null, 2))
      }
      const data = await res.json()
      setResults(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/measures/walls/export/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(JSON.stringify(errData, null, 2))
      }
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'walls_thermal_insulation.docx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="measure-container">
      <header className="measure-header">
        <h2>🧱 Улучшение теплозащитных свойств стен</h2>
        <p className="measure-subtitle">
          Расчёт экономии тепловой энергии за счёт утепления стен и повышения их сопротивления теплопередаче.
        </p>
      </header>

      <div className="measure-content">
        <div className="measure-inputs">
          <BuildingsList
            buildings={input.buildings}
            onChange={(b) => setInput({ ...input, buildings: b })}
          />
          <SharedParamsForm
            shared={input.shared}
            onChange={(s) => setInput({ ...input, shared: s })}
          />
          <InvestmentTable
            items={input.investment_items}
            onChange={(items) => setInput({ ...input, investment_items: items })}
          />

          <div className="card">
            <h3>Финансовые параметры</h3>
            <div className="grid">
              <label className="field-group">
                <span>Ставка дисконтирования (доли)</span>
                <input
                  type="number"
                  step="0.01"
                  value={input.finance.discount_rate}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      finance: { ...input.finance, discount_rate: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </label>
              <label className="field-group">
                <span>Горизонт расчёта (лет)</span>
                <input
                  type="number"
                  value={input.finance.horizon_years}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      finance: { ...input.finance, horizon_years: parseInt(e.target.value) || 1 },
                    })
                  }
                />
              </label>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="action-buttons">
            <button
              className="btn btn--primary"
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? 'Считаем...' : 'Рассчитать'}
            </button>
            {results && (
              <button
                className="btn btn--secondary"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Генерация...' : 'Скачать отчёт (.docx)'}
              </button>
            )}
          </div>
        </div>

        <div className="measure-results">
          {results ? (
            <ResultsPanel results={results} />
          ) : (
            <div className="results-placeholder">
              <p>Заполните исходные данные и нажмите «Рассчитать»</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
