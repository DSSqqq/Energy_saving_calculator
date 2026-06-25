/**
 * Корневой экран SPA. Сейчас открывает мероприятие «Окна»; в дальнейшем здесь
 * будет навигация по списку мероприятий (см. /api/measures/).
 */
import { useState, useEffect } from 'react'
import './App.css'
import { WindowsMeasure } from './measures/windows/WindowsMeasure'
import { WallsMeasure } from './measures/walls/WallsMeasure'
import { CurtainsMeasure } from './measures/curtains/CurtainsMeasure'
import { HeatingMeasure } from './measures/heating/HeatingMeasure'
import { ATPMeasure } from './measures/atp/ATPMeasure'
import { TemplatesPage } from './TemplatesPage'
import { HomePage } from './HomePage'
import { TasksPage } from './TasksPage'
import { AuthPage } from './AuthPage'
import { UsersPage } from './UsersPage'
import { GeoObjectsPage } from './GeoObjectsPage'
import { ObjectDetailsPage } from './ObjectDetailsPage'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'))

  const getInitialObjectId = (): number | null => {
    const hash = window.location.hash
    if (hash.startsWith('#/objects/')) {
      const parts = hash.split('/')
      const id = parseInt(parts[2], 10)
      return isNaN(id) ? null : id
    }
    return null
  }

  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(getInitialObjectId)

  // Helper to determine initial view based on URL hash
  const getInitialView = (): 'home' | 'templates' | 'windows' | 'walls' | 'curtains' | 'heating' | 'tasks' | 'atp' | 'users' | 'geo_objects' | 'object_details' => {
    const hash = window.location.hash
    if (hash === '#/templates') return 'templates'
    if (hash === '#/windows') return 'windows'
    if (hash === '#/walls') return 'walls'
    if (hash === '#/curtains') return 'curtains'
    if (hash === '#/heating') return 'heating'
    if (hash === '#/tasks') return 'tasks'
    if (hash === '#/atp') return 'atp'
    if (hash === '#/users') return 'users'
    if (hash === '#/objects') return 'geo_objects'
    if (hash.startsWith('#/objects/')) return 'object_details'
    return 'home'
  }

  const [currentView, setCurrentView] = useState<'home' | 'templates' | 'windows' | 'walls' | 'curtains' | 'heating' | 'tasks' | 'atp' | 'users' | 'geo_objects' | 'object_details'>(getInitialView)

  const handleLoginSuccess = (newToken: string, newUsername: string) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('username', newUsername)
    setToken(newToken)
    setUsername(newUsername)
    setCurrentView('home')
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout/', {
        method: 'POST',
      })
    } catch (e) {
      console.error("Logout failed", e)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      setToken(null)
      setUsername(null)
    }
  }

  // Sync URL hash when view changes
  useEffect(() => {
    const hashMap: Record<string, string> = {
      home: '#/',
      templates: '#/templates',
      windows: '#/windows',
      walls: '#/walls',
      curtains: '#/curtains',
      heating: '#/heating',
      tasks: '#/tasks',
      atp: '#/atp',
      users: '#/users',
      geo_objects: '#/objects',
      object_details: `#/objects/${selectedObjectId}`,
    }
    const target = hashMap[currentView] ?? '#/'
    if (window.location.hash !== target) {
      window.location.hash = target
    }
  }, [currentView, selectedObjectId])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#/templates') setCurrentView('templates')
      else if (hash === '#/windows') setCurrentView('windows')
      else if (hash === '#/walls') setCurrentView('walls')
      else if (hash === '#/curtains') setCurrentView('curtains')
      else if (hash === '#/heating') setCurrentView('heating')
      else if (hash === '#/tasks') setCurrentView('tasks')
      else if (hash === '#/atp') setCurrentView('atp')
      else if (hash === '#/users') setCurrentView('users')
      else if (hash === '#/objects') setCurrentView('geo_objects')
      else if (hash.startsWith('#/objects/')) {
        const parts = hash.split('/')
        const id = parseInt(parts[2], 10)
        if (!isNaN(id)) {
          setSelectedObjectId(id)
          setCurrentView('object_details')
        }
      }
      else if (hash === '#/' || hash === '') setCurrentView('home')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])


  if (!token) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <>
      <header className="global-header">
        <div className="global-header__container">
          <div className="global-header__logo">
            <span className="global-header__logo-text">Энерго-Аудит</span>
            <span className="global-header__logo-icon">⚡</span>
          </div>
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
          
          <div className="global-header__user" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="user-greeting" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
              👤 {username}
            </span>
            <button 
              type="button" 
              className="btn btn--ghost btn--small" 
              onClick={handleLogout}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              Выйти
            </button>
          </div>
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
      ) : currentView === 'curtains' ? (
        <CurtainsMeasure />
      ) : currentView === 'heating' ? (
        <HeatingMeasure />
      ) : currentView === 'atp' ? (
        <ATPMeasure />
      ) : currentView === 'tasks' ? (
        <TasksPage />
      ) : currentView === 'users' ? (
        <UsersPage />
      ) : currentView === 'geo_objects' ? (
        <GeoObjectsPage 
          onOpenObject={(id) => {
            setSelectedObjectId(id)
            setCurrentView('object_details')
          }} 
        />
      ) : currentView === 'object_details' ? (
        selectedObjectId !== null ? (
          <ObjectDetailsPage 
            objectId={selectedObjectId} 
            onBack={() => setCurrentView('geo_objects')} 
          />
        ) : null
      ) : null}
    </>
  )
}

export default App
