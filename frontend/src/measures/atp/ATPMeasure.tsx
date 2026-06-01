import { useState } from 'react'

import { BuildingsList } from './BuildingsList'
import { ResultsPanel } from './ResultsPanel'
import { SharedParamsForm } from './SharedParamsForm'
import { DEFAULT_ATP_INPUT } from './defaults'
import type { CalculateResponse, ATPInput } from './types'

const API_BASE = '/api/measures/atp'

export function ATPMeasure() {
  const [input, setInput] = useState<ATPInput>(DEFAULT_ATP_INPUT)
  const [inputMode, setInputMode] = useState<'single' | 'multi'>('single')
  const [result, setResult] = useState<CalculateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'idle' | 'calc' | 'export'>('idle')

  function handleModeChange(mode: 'single' | 'multi') {
    setInputMode(mode)
    if (mode === 'single') {
      // Сворачиваем в одно здание: суммируем нагрузки и инвестиции
      if (input.buildings.length > 1) {
        const totalQ = input.buildings.reduce((sum, b) => sum + (b.q_annual || 0), 0)
        const totalInvest = input.buildings.reduce((sum, b) => sum + (b.investment || 0), 0)
        const first = input.buildings[0]
        setInput({
          ...input,
          buildings: [
            {
              ...first,
              name: 'Момышулы, 23 (Весь объект)',
              q_annual: totalQ,
              investment: totalInvest,
            },
          ],
        })
      } else if (input.buildings.length === 1) {
        setInput({
          ...input,
          buildings: [
            {
              ...input.buildings[0],
              name: 'Момышулы, 23 (Весь объект)',
            },
          ],
        })
      }
    } else {
      // Разворачиваем: если было одно сводное здание "Момышулы, 23 (Весь объект)", восстанавливаем дефолтные два здания
      if (input.buildings.length === 1 && input.buildings[0].name === 'Момышулы, 23 (Весь объект)') {
        setInput({
          ...input,
          buildings: [
            {
              name: 'Момышулы, 23 (АБК)',
              q_annual: 886.6,
              t_inside: 21.0,
              t_standby: 18.0,
              t_outside_avg: -6.8,
              t_outside_design: -32.8,
              period_days: 205,
              weekend_days: 41,
              day_hours: 10,
              fuel_tariff: 13289.77,
              investment: 4000000,
            },
            {
              name: 'Момышулы, 23 (Второй объект)',
              q_annual: 222.596,
              t_inside: 21.0,
              t_standby: 18.0,
              t_outside_avg: -6.8,
              t_outside_design: -32.8,
              period_days: 205,
              weekend_days: 41,
              day_hours: 10,
              fuel_tariff: 13289.77,
              investment: 3500000,
            },
          ],
        })
      }
    }
  }

  async function calculate() {
    setError(null)
    setLoading('calc')
    try {
      const res = await fetch(`${API_BASE}/calculate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(JSON.stringify(data, null, 2))
        setResult(null)
        return
      }
      setResult(data as CalculateResponse)
    } catch {
      setError('Не удалось связаться с сервером. Запущен ли Django на :8000?')
    } finally {
      setLoading('idle')
    }
  }

  async function exportDocx() {
    setError(null)
    setLoading('export')
    try {
      const res = await fetch(`${API_BASE}/export/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(JSON.stringify(data, null, 2))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'atp_modernization.docx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch {
      setError('Не удалось получить .docx с сервера.')
    } finally {
      setLoading('idle')
    }
  }

  // При первой инициализации, если дефолтные два здания, свернем их в одно в соответствии с single по умолчанию
  if (inputMode === 'single' && input.buildings.length > 1) {
    const totalQ = input.buildings.reduce((sum, b) => sum + (b.q_annual || 0), 0)
    const totalInvest = input.buildings.reduce((sum, b) => sum + (b.investment || 0), 0)
    const first = input.buildings[0]
    setInput({
      ...input,
      buildings: [
        {
          ...first,
          name: 'Момышулы, 23 (Весь объект)',
          q_annual: totalQ,
          investment: totalInvest,
        },
      ],
    })
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>
          <span className="title-icon">🔥</span>Организация (модернизация) автоматизированного теплового пункта (АТП)
        </h1>
      </header>

      {/* Выбор режима расчёта и общая нагрузка */}
      <section className="block">
        <header className="block__header">
          <h2>
            <span className="title-icon">⚙️</span>Режим расчета и общая нагрузка
          </h2>
        </header>
        <div className="grid">
          <div className="field">
            <span>Тип детализации объекта</span>
            <div className="input-mode-selector" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${inputMode === 'single' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => handleModeChange('single')}
                style={{ flex: 1 }}
              >
                Для всего объекта целиком
              </button>
              <button
                type="button"
                className={`btn ${inputMode === 'multi' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => handleModeChange('multi')}
                style={{ flex: 1 }}
              >
                Для каждого здания отдельно
              </button>
            </div>
          </div>

          {inputMode === 'single' ? (
            <label className="field">
              <span>Годовая тепловая нагрузка на систему отопления, Гкал/год</span>
              <input
                type="number"
                value={Number.isFinite(input.buildings[0]?.q_annual) ? input.buildings[0].q_annual : ''}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setInput({
                    ...input,
                    buildings: input.buildings.map((b, i) => (i === 0 ? { ...b, q_annual: val } : b)),
                  })
                }}
                step="any"
                min={0.01}
                style={{ marginTop: '0.5rem' }}
                placeholder="Общее потребление Гкал всех зданий"
              />
            </label>
          ) : (
            <div className="field" style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                ℹ️ Годовое теплопотребление настраивается отдельно для каждого здания в блоке ниже.
              </span>
            </div>
          )}
        </div>
      </section>

      <BuildingsList
        buildings={input.buildings}
        onChange={(buildings) => setInput({ ...input, buildings })}
        mode={inputMode}
      />

      <SharedParamsForm
        shared={input.shared}
        finance={input.finance}
        onSharedChange={(shared) => setInput({ ...input, shared })}
        onFinanceChange={(finance) => setInput({ ...input, finance })}
      />

      <section className="actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={calculate}
          disabled={loading !== 'idle'}
        >
          {loading === 'calc' ? 'Считаем…' : 'Рассчитать'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={exportDocx}
          disabled={loading !== 'idle'}
        >
          {loading === 'export' ? 'Готовим .docx…' : 'Скачать .docx'}
        </button>
      </section>

      {error && (
        <pre className="panel panel--error" role="alert">
          {error}
        </pre>
      )}

      {result && <ResultsPanel result={result} />}
    </main>
  )
}
