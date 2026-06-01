import { useState } from 'react'

import { BuildingsList } from './BuildingsList'
import { ResultsPanel } from './ResultsPanel'
import { SharedParamsForm } from './SharedParamsForm'
import { DEFAULT_ATP_INPUT } from './defaults'
import type { CalculateResponse, ATPInput, Building } from './types'

const API_BASE = '/api/measures/atp'

export function ATPMeasure() {
  const [input, setInput] = useState<ATPInput>(DEFAULT_ATP_INPUT)
  const [inputMode, setInputMode] = useState<'single' | 'multi'>('single')
  const [result, setResult] = useState<CalculateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'idle' | 'calc' | 'export'>('idle')

  const totalQ = input.buildings.reduce((sum, b) => sum + (b.q_annual || 0), 0)

  function handleTotalQChange(newTotal: number) {
    if (newTotal <= 0) return
    const oldTotal = totalQ
    if (oldTotal <= 0) {
      const val = newTotal / input.buildings.length
      setInput({
        ...input,
        buildings: input.buildings.map((b) => ({ ...b, q_annual: val })),
      })
    } else {
      const factor = newTotal / oldTotal
      setInput({
        ...input,
        buildings: input.buildings.map((b) => ({
          ...b,
          q_annual: (b.q_annual || 0) * factor,
        })),
      })
    }
  }

  function handleBuildingsChange(newBuildings: Building[]) {
    if (inputMode === 'single') {
      const targetTotal = totalQ
      const newSum = newBuildings.reduce((sum, b) => sum + (b.q_annual || 0), 0)
      if (newSum > 0) {
        const factor = targetTotal / newSum
        setInput({
          ...input,
          buildings: newBuildings.map((b) => ({
            ...b,
            q_annual: (b.q_annual || 0) * factor,
          })),
        })
      } else {
        const val = targetTotal / newBuildings.length
        setInput({
          ...input,
          buildings: newBuildings.map((b) => ({ ...b, q_annual: val })),
        })
      }
    } else {
      setInput({ ...input, buildings: newBuildings })
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
            <span>Режим ввода потребления</span>
            <div className="input-mode-selector" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${inputMode === 'single' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setInputMode('single')}
                style={{ flex: 1 }}
              >
                Для всего объекта целиком
              </button>
              <button
                type="button"
                className={`btn ${inputMode === 'multi' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setInputMode('multi')}
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
                value={Number.isFinite(totalQ) ? Number(totalQ.toFixed(4)) : ''}
                onChange={(e) => handleTotalQChange(Number(e.target.value))}
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
        onChange={handleBuildingsChange}
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
