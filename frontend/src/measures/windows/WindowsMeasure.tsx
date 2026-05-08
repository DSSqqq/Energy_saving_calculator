/**
 * Корневой компонент мероприятия «Окна»: компонует все формы, делает запросы
 * на /api/measures/windows/calculate и /api/measures/windows/export.
 */
import { useState } from 'react'

import { BuildingsList } from './BuildingsList'
import { InvestmentTable } from './InvestmentTable'
import { ResultsPanel } from './ResultsPanel'
import { SharedParamsForm } from './SharedParamsForm'
import { DEFAULT_INPUT } from './defaults'
import type { CalculateResponse, WindowsInput } from './types'

const API_BASE = '/api/measures/windows'

export function WindowsMeasure() {
  const [input, setInput] = useState<WindowsInput>(DEFAULT_INPUT)
  const [result, setResult] = useState<CalculateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'idle' | 'calc' | 'export'>('idle')

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
      a.download = 'windows_thermal_insulation.docx'
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
        <h1>Энерго-аудит. Мероприятие 1: окна</h1>
        <p className="app__lead">
          Расчёт экономии тепловой энергии (теплопередача и инфильтрация) по нескольким
          зданиям; экспорт раздела отчёта в Word с формулами, таблицами и графиком NPV.
        </p>
      </header>

      <BuildingsList
        buildings={input.buildings}
        onChange={(buildings) => setInput({ ...input, buildings })}
      />

      <SharedParamsForm
        shared={input.shared}
        finance={input.finance}
        onSharedChange={(shared) => setInput({ ...input, shared })}
        onFinanceChange={(finance) => setInput({ ...input, finance })}
      />

      <InvestmentTable
        items={input.investment_items}
        onChange={(items) => setInput({ ...input, investment_items: items })}
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
