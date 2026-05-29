type Props = {
  onSelectMeasure: (id: 'home' | 'templates' | 'windows' | 'walls' | 'curtains' | 'heating' | 'tasks' | 'atp') => void
}

export function TemplatesPage({ onSelectMeasure }: Props) {
  return (
    <main className="app">
      <div className="bento-header">
        <div className="bento-header__line"></div>
        <h2>Шаблоны мероприятий</h2>
      </div>

      <div className="templates-grid">
        <div className="template-card template-card--orange" onClick={() => onSelectMeasure('windows')} title="Мероприятие по ремонту оконных блоков">
          <div className="template-card__icon">🪟</div>
          <h3 className="template-card__title">Мероприятие по ремонту оконных блоков</h3>
        </div>

        <div className="template-card template-card--purple" onClick={() => onSelectMeasure('walls')} title="Мероприятие по улучшению теплозащитных свойств стен">
          <div className="template-card__icon">🧱</div>
          <h3 className="template-card__title">Мероприятие по улучшению теплозащитных свойств стен</h3>
        </div>

        <div className="template-card template-card--blue" onClick={() => onSelectMeasure('curtains')} title="Мероприятие по применению энергосберегающих ПВХ завес">
          <div className="template-card__icon">🚪</div>
          <h3 className="template-card__title">Мероприятие по применению энергосберегающих ПВХ завес</h3>
        </div>

        <div className="template-card template-card--yellow" onClick={() => onSelectMeasure('heating')} title="Мероприятие по теплоизоляции тепловых пунктов">
          <div className="template-card__icon">♨️</div>
          <h3 className="template-card__title">Мероприятие по теплоизоляции тепловых пунктов</h3>
        </div>

        <div className="template-card template-card--green" onClick={() => onSelectMeasure('atp')} title="Модернизация автоматизированного теплового пункта (АТП)">
          <div className="template-card__icon">🔥</div>
          <h3 className="template-card__title">Модернизация автоматизированного теплового пункта (АТП)</h3>
        </div>
      </div>
    </main>
  )
}
