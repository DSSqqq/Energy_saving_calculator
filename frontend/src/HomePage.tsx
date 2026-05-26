type Props = {
  onSelectView: (view: 'home' | 'templates' | 'windows' | 'tasks') => void
}

export function HomePage({ onSelectView }: Props) {
  return (
    <main className="app">
      <div className="bento-header">
        <div className="bento-header__line"></div>
        <h2>Главная</h2>
      </div>

      <div className="bento-grid">
        <div className="bento-card bento-card--tall bento-card--orange" onClick={() => onSelectView('tasks')}>
          <div className="bento-card__icon">📅</div>
          <div className="bento-card__title">Задачи</div>
        </div>

        <div className="bento-card bento-card--purple" onClick={() => onSelectView('templates')}>
          <div className="bento-card__icon">📖</div>
          <div className="bento-card__title">Шаблоны<br/>мероприятий</div>
        </div>

        <div className="bento-card bento-card--blue">
          <div className="bento-card__icon">📊</div>
          <div className="bento-card__title">Отчеты по<br/>проектам</div>
        </div>

        <div className="bento-card bento-card--yellow">
          <div className="bento-card__icon">👤</div>
          <div className="bento-card__title">Мой профиль</div>
        </div>

        <div className="bento-card bento-card--green">
          <div className="bento-card__icon">📈</div>
          <div className="bento-card__title">Выполненный<br/>объем работ</div>
        </div>

        <div className="bento-card bento-card--pink">
          <div className="bento-card__icon">💡</div>
          <div className="bento-card__title">Новые<br/>продукты</div>
        </div>

        <div className="bento-card bento-card--blue">
          <div className="bento-card__icon">🤍</div>
          <div className="bento-card__title">Культура<br/>компании</div>
        </div>
      </div>
    </main>
  )
}
