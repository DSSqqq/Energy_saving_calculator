import { useState, useEffect } from 'react'

type TaskStatus = '' | 'К выполнению' | 'В работе' | 'Готово'

type Task = {
  id: string
  title: string
  assignee: string
  status: TaskStatus
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    fetch('/api/tasks/')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok')
        return res.json()
      })
      .then((data) => setTasks(data as Task[]))
      .catch((err) => console.error('Failed to load tasks:', err))
  }, [])

  const addTask = () => {
    const newTask = {
      title: '',
      assignee: '',
      status: '',
    }
    fetch('/api/tasks/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create task')
        return res.json()
      })
      .then((savedTask: Task) => {
        setTasks((prev) => [...prev, savedTask])
      })
      .catch((err) => console.error('Failed to add task:', err))
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    // Optimistic UI update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))

    fetch(`/api/tasks/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update task')
      })
      .catch((err) => console.error('Failed to update task:', err))
  }

  const removeTask = (id: string) => {
    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => t.id !== id))

    fetch(`/api/tasks/${id}/`, {
      method: 'DELETE',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete task')
      })
      .catch((err) => console.error('Failed to delete task:', err))
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>
          <span className="title-icon">📅</span>Задачи
        </h1>
        <p className="app__lead">
          Управление задачами и назначение исполнителей
        </p>
      </header>

      <section className="block">
        <header className="block__header">
          <h2>Список задач</h2>
          <button type="button" className="btn btn--ghost" onClick={addTask}>
            + Добавить задачу
          </button>
        </header>

        {tasks.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '1rem' }}>
            Нет активных задач. Нажмите «+ Добавить задачу», чтобы начать.
          </p>
        ) : (
          <div className="tasks-list">
            <div className="tasks-list__header">
              <div className="tasks-list__col-title">Название задачи</div>
              <div className="tasks-list__col-assignee">Исполнитель</div>
              <div className="tasks-list__col-status">Статус</div>
              <div className="tasks-list__col-actions"></div>
            </div>
            
            {tasks.map((task) => (
              <div key={task.id} className="task-row">
                <div className="task-row__field tasks-list__col-title">
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    placeholder="Введите название задачи..."
                  />
                </div>
                
                <div className="task-row__field tasks-list__col-assignee">
                  <input
                    type="text"
                    value={task.assignee}
                    onChange={(e) => updateTask(task.id, { assignee: e.target.value })}
                    placeholder="Имя сотрудника"
                  />
                </div>
                
                <div className="task-row__field tasks-list__col-status">
                  <select
                    value={task.status}
                    onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                  >
                    <option value="" disabled hidden>Выберите статус</option>
                    <option value="К выполнению">К выполнению</option>
                    <option value="В работе">В работе</option>
                    <option value="Готово">Готово</option>
                  </select>
                </div>
                
                <div className="task-row__actions tasks-list__col-actions">
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    onClick={() => {
                      if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
                        removeTask(task.id)
                      }
                    }}
                    title="Удалить задачу"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
