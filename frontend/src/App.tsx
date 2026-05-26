/**
 * Корневой экран SPA. Сейчас открывает мероприятие «Окна»; в дальнейшем здесь
 * будет навигация по списку мероприятий (см. /api/measures/).
 */
import { useState, useEffect } from 'react'
import './App.css'
import { WindowsMeasure } from './measures/windows/WindowsMeasure'
import { WallsMeasure } from './measures/walls/WallsMeasure'
import { TemplatesPage } from './TemplatesPage'
import { HomePage } from './HomePage'
import { TasksPage } from './TasksPage'

function App() {
  // Helper to determine initial view based on URL hash
  const getInitialView = (): 'home' | 'templates' | 'windows' | 'walls' | 'tasks' => {
    const hash = window.location.hash
    if (hash === '#/templates') return 'templates'
    if (hash === '#/windows') return 'windows'
    if (hash === '#/walls') return 'walls'
    if (hash === '#/tasks') return 'tasks'
    return 'home'
  }

  const [currentView, setCurrentView] = useState<'home' | 'templates' | 'windows' | 'walls' | 'tasks'>(getInitialView)

  // Sync URL hash when view changes
  useEffect(() => {
    const hashMap: Record<string, string> = {
      home: '#/',
      templates: '#/templates',
      windows: '#/windows',
      walls: '#/walls',
      tasks: '#/tasks',
    }
    const target = hashMap[currentView] ?? '#/'
    if (window.location.hash !== target) {
      window.location.hash = target
    }
  }, [currentView])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#/templates') setCurrentView('templates')
      else if (hash === '#/windows') setCurrentView('windows')
      else if (hash === '#/walls') setCurrentView('walls')
      else if (hash === '#/tasks') setCurrentView('tasks')
      else if (hash === '#/' || hash === '') setCurrentView('home')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])


  return (
    <>
      <header className="global-header">
        <div className="global-header__container">
          <div className="global-header__logo">Энерго-Аудит ⚡</div>
          <nav className="global-header__nav">
            <a 
              href="#/" 
              className={`global-header__tab ${currentView === 'home' ? 'global-header__tab--active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setCurrentView('home')
              }}
            >
              Главная
            </a>
            <a 
              href="#/templates" 
              className={`global-header__tab ${currentView === 'templates' ? 'global-header__tab--active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setCurrentView('templates')
              }}
            >
              Шаблоны мероприятий
            </a>
            <a 
              href="#/tasks" 
              className={`global-header__tab ${currentView === 'tasks' ? 'global-header__tab--active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setCurrentView('tasks')
              }}
            >
              Задачи
            </a>
          </nav>
        </div>
      </header>
      {currentView === 'home' ? (
        <HomePage onSelectView={setCurrentView} />
      ) : currentView === 'templates' ? (
        <TemplatesPage onSelectMeasure={setCurrentView} />
      ) : currentView === 'windows' ? (
        <WindowsMeasure />
      ) : currentView === 'walls' ? (
        <WallsMeasure />
      ) : currentView === 'tasks' ? (
        <TasksPage />
      ) : null}
    </>
  )
}

export default App
