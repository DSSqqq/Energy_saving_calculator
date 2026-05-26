/**
 * Корневой компонент мероприятия «ПВХ завесы».
 * Страница-заглушка — структура идентична «Окнам», наполнение будет добавлено позже.
 */

export function CurtainsMeasure() {
  return (
    <main className="app">
      <header className="app__header">
        <h1><span className="title-icon">🚪</span>Мероприятие по применению энергосберегающих ПВХ завес</h1>
      </header>

      {/* Блок: Здания */}
      <section className="block">
        <header className="block__header">
          <h2><span className="title-icon">🏢</span>Здания</h2>
          <button type="button" className="btn btn--ghost" disabled>
            + Добавить здание
          </button>
        </header>
        <div className="buildings">
          <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            В разработке…
          </div>
        </div>
      </section>

      {/* Блок: Общие параметры */}
      <section className="block">
        <header className="block__header">
          <h2><span className="title-icon">⚙️</span>Общие параметры расчёта</h2>
        </header>
        <div className="grid">
          <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            В разработке…
          </div>
        </div>
      </section>

      {/* Блок: Смета */}
      <section className="block">
        <header className="block__header">
          <h2><span className="title-icon">💰</span>Смета</h2>
          <button type="button" className="btn btn--ghost" disabled>
            + Добавить строку
          </button>
        </header>
        <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          В разработке…
        </div>
      </section>

      {/* Кнопки действий */}
      <section className="actions">
        <button type="button" className="btn btn--primary" disabled>
          Рассчитать
        </button>
        <button type="button" className="btn" disabled>
          Скачать .docx
        </button>
      </section>
    </main>
  )
}
