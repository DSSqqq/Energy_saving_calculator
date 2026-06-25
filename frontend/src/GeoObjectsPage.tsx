import React, { useState, useEffect } from 'react';

interface GeoObject {
  id: number;
  name: string;
  contract_number: string;
  created_at: string;
}

interface GeoObjectsPageProps {
  onOpenObject: (id: number) => void;
}

export function GeoObjectsPage({ onOpenObject }: GeoObjectsPageProps) {
  const [objects, setObjects] = useState<GeoObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<GeoObject | null>(null);
  const [name, setName] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  const fetchObjects = async (pageNumber: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/objects/?page=${pageNumber}`);
      if (!res.ok) {
        throw new Error('Не удалось загрузить список объектов');
      }
      const data = await res.json();
      setObjects(data.results || []);
      setTotalPages(Math.ceil((data.count || 0) / 10) || 1);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects(page);
  }, [page]);

  const handleOpenCreate = () => {
    setEditingObject(null);
    setName('');
    setContractNumber('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (obj: GeoObject) => {
    setEditingObject(obj);
    setName(obj.name);
    setContractNumber(obj.contract_number);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот объект и все его здания?')) {
      return;
    }
    try {
      const res = await fetch(`/api/objects/${id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Не удалось удалить объект');
      }
      // If we deleted the last item on the page, go back a page
      if (objects.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchObjects(page);
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Имя объекта обязательно для заполнения');
      return;
    }
    setFormError('');
    setSubmitting(true);

    const url = editingObject ? `/api/objects/${editingObject.id}/` : '/api/objects/';
    const method = editingObject ? 'PUT' : 'POST';
    const payload = { name, contract_number: contractNumber };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.name?.[0] || 'Ошибка сохранения');
      }

      setIsFormOpen(false);
      fetchObjects(page);
    } catch (err: any) {
      setFormError(err.message || 'Ошибка отправки запроса');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app">
      {activeDropdownId !== null && (
        <div 
          className="dropdown-backdrop" 
          onClick={() => setActiveDropdownId(null)} 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, background: 'transparent' }}
        />
      )}
      <header className="app__header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <span className="title-icon">🏢</span>Геометрические параметры зданий
        </h1>
      </header>

      {/* Form Card (Create/Edit) */}
      {isFormOpen && (
        <section className="block" style={{ border: '1px solid #2ed38a', boxShadow: '0 4px 20px rgba(46, 211, 138, 0.1)' }}>
          <header className="block__header">
            <h2>{editingObject ? 'Редактировать объект' : 'Добавить новый объект'}</h2>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setIsFormOpen(false)}>
              Отмена
            </button>
          </header>
          
          {formError && <div className="panel panel--error" style={{ marginBottom: '1rem' }}>{formError}</div>}
          
          <form onSubmit={handleFormSubmit} className="grid" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'flex-end', gap: '1rem' }}>
            <div className="field">
              <span>Название объекта *</span>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Например, Офисный центр 'Прогресс'"
                required 
              />
            </div>
            <div className="field">
              <span>Номер договора</span>
              <input 
                type="text" 
                value={contractNumber} 
                onChange={(e) => setContractNumber(e.target.value)} 
                placeholder="Например, № Д-104/26"
              />
            </div>
            <div>
              <button type="submit" className="btn btn--primary" disabled={submitting} style={{ height: '2.5rem' }}>
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          Загрузка списка объектов...
        </div>
      ) : error ? (
        <div className="panel panel--error">
          {error}
        </div>
      ) : (
        <section className="block">
          <header className="block__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Зарегистрированные объекты</h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button type="button" className="btn btn--primary btn--small" onClick={handleOpenCreate}>
                + Добавить объект
              </button>
              <a href="#/" className="btn btn--ghost btn--small" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                На главную
              </a>
            </div>
          </header>

          {objects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
              У вас еще нет добавленных объектов. Нажмите «+ Добавить объект», чтобы начать.
            </div>
          ) : (
            <>
              <div className="results-table-wrap">
                <table className="invest-table">
                  <thead>
                    <tr>
                      <th>Название объекта</th>
                      <th>Номер договора</th>
                      <th>Дата создания</th>
                      <th style={{ width: '180px', textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {objects.map((obj) => (
                      <tr key={obj.id} style={{ cursor: 'pointer' }} onClick={() => onOpenObject(obj.id)}>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{obj.name}</td>
                        <td>{obj.contract_number || <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontStyle: 'italic' }}>не указан</span>}</td>
                        <td style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                          {new Date(obj.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ textAlign: 'right', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button" 
                            className="btn-icon" 
                            onClick={() => setActiveDropdownId(activeDropdownId === obj.id ? null : obj.id)}
                            title="Действия"
                          >
                            ☰
                          </button>
                          
                          {activeDropdownId === obj.id && (
                            <div className="action-dropdown">
                              <button 
                                type="button" 
                                className="action-dropdown__item" 
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  onOpenObject(obj.id);
                                }}
                              >
                                Открыть
                              </button>
                              <button 
                                type="button" 
                                className="action-dropdown__item" 
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenEdit(obj);
                                }}
                              >
                                Редактировать
                              </button>
                              <div className="action-dropdown__divider" />
                              <button 
                                type="button" 
                                className="action-dropdown__item action-dropdown__item--danger" 
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleDelete(obj.id);
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn--ghost btn--small"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    ← Назад
                  </button>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Страница {page} из {totalPages}
                  </span>
                  <button 
                    type="button" 
                    className="btn btn--ghost btn--small"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Вперед →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
