import { useState, useEffect } from 'react'

interface User {
  id: number
  username: string
  email: string
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/auth/users/')
        if (!res.ok) {
          throw new Error('Не удалось загрузить список пользователей')
        }
        const data = await res.json()
        setUsers(data)
      } catch (err: any) {
        setError(err.message || 'Произошла ошибка')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  return (
    <main className="app">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      <header className="app__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <span className="title-icon">👤</span>Кадры
        </h1>
        <a 
          href="#/" 
          className="btn btn--ghost" 
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          На главную
        </a>
      </header>

      {error ? (
        <div className="panel panel--error">
          {error}
        </div>
      ) : (
        <section className="block">
          <header className="block__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Список зарегистрированных сотрудников</h2>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
              Всего сотрудников: {users.length}
            </span>
          </header>

          <div className="results-table-wrap">
            <table className="invest-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '80px', color: 'rgba(255, 255, 255, 0.7)' }}>ID</th>
                  <th style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Логин (Username)</th>
                  <th style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Email адрес</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="user-row" style={{ height: '3.5rem' }}>
                    <td style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>#{user.id}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{user.username}</td>
                    <td style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      {user.email || <span style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.3)' }}>не указан</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
