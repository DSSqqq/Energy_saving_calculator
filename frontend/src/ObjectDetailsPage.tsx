import React, { useState, useEffect } from 'react';

interface GeoObject {
  id: number;
  name: string;
  contract_number: string;
}

interface Building {
  id: number;
  object: number;
  name: string;
  created_at: string;
}

interface ObjectDetailsPageProps {
  objectId: number;
  onBack: () => void;
}

export function ObjectDetailsPage({ objectId, onBack }: ObjectDetailsPageProps) {
  const [objectInfo, setObjectInfo] = useState<GeoObject | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Fetch Object Details and Buildings list
  const fetchObjectAndBuildings = async (pageNumber: number) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Object Details if not already fetched
      if (!objectInfo) {
        const objRes = await fetch(`/api/objects/${objectId}/`);
        if (!objRes.ok) {
          throw new Error('Не удалось загрузить информацию об объекте');
        }
        const objData = await objRes.json();
        setObjectInfo(objData);
      }

      // 2. Fetch Buildings
      const buildRes = await fetch(`/api/buildings/?object=${objectId}&page=${pageNumber}`);
      if (!buildRes.ok) {
        throw new Error('Не удалось загрузить список зданий');
      }
      const buildData = await buildRes.json();
      setBuildings(buildData.results || []);
      setTotalPages(Math.ceil((buildData.count || 0) / 20) || 1);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectAndBuildings(page);
  }, [objectId, page]);

  const handleOpenCreate = () => {
    setEditingBuilding(null);
    setName('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (bld: Building) => {
    setEditingBuilding(bld);
    setName(bld.name);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это здание?')) {
      return;
    }
    try {
      const res = await fetch(`/api/buildings/${id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Не удалось удалить здание');
      }
      // If we deleted the last item on the page, go back a page
      if (buildings.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchObjectAndBuildings(page);
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Название здания обязательно для заполнения');
      return;
    }
    setFormError('');
    setSubmitting(true);

    const url = editingBuilding ? `/api/buildings/${editingBuilding.id}/` : '/api/buildings/';
    const method = editingBuilding ? 'PUT' : 'POST';
    const payload = { object: objectId, name };

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
      fetchObjectAndBuildings(page);
    } catch (err: any) {
      setFormError(err.message || 'Ошибка отправки запроса');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuildingClick = (bldName: string) => {
    alert(`Переход к расчету здания "${bldName}" в разработке...`);
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
      <header className="app__header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <span className="title-icon">🏢</span>{objectInfo ? objectInfo.name : 'Загрузка объекта...'}
        </h1>
      </header>

      {objectInfo && objectInfo.contract_number && (
        <p style={{ marginTop: '-1rem', marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500, fontSize: '0.95rem' }}>
          Договор: {objectInfo.contract_number}
        </p>
      )}



      {/* Building Form (Create/Edit) */}
      {isFormOpen && (
        <section className="block" style={{ border: '1px solid #2ed38a', boxShadow: '0 4px 20px rgba(46, 211, 138, 0.1)' }}>
          <header className="block__header">
            <h2>{editingBuilding ? 'Редактировать здание' : 'Добавить новое здание'}</h2>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setIsFormOpen(false)}>
              Отмена
            </button>
          </header>
          
          {formError && <div className="panel panel--error" style={{ marginBottom: '1rem' }}>{formError}</div>}
          
          <form onSubmit={handleFormSubmit} className="grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'flex-end', gap: '1rem' }}>
            <div className="field">
              <span>Название здания *</span>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Например, Корпус 1, Склад №2"
                required 
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

      {loading && buildings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          Загрузка списка зданий...
        </div>
      ) : error ? (
        <div className="panel panel--error">
          {error}
        </div>
      ) : (
        <section className="block">
          <header className="block__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h2 style={{ margin: 0 }}>Здания на объекте</h2>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                Всего: {buildings.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button type="button" className="btn btn--primary btn--small" onClick={handleOpenCreate}>
                + Добавить здание
              </button>
              <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
                ← Назад к объектам
              </button>
              <a href="#/" className="btn btn--ghost btn--small" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                На главную
              </a>
            </div>
          </header>

          {buildings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
              В этом объекте еще нет зданий. Нажмите «+ Добавить здание», чтобы начать.
            </div>
          ) : (
            <>
              <div className="results-table-wrap">
                <table className="invest-table">
                  <thead>
                    <tr>
                      <th>Название здания</th>
                      <th>Дата создания</th>
                      <th style={{ width: '180px', textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildings.map((bld) => (
                      <tr key={bld.id} style={{ cursor: 'pointer' }} onClick={() => handleBuildingClick(bld.name)}>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>
                          🏢 {bld.name}
                        </td>
                        <td style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                          {new Date(bld.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ textAlign: 'right', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button" 
                            className="btn-icon" 
                            onClick={() => setActiveDropdownId(activeDropdownId === bld.id ? null : bld.id)}
                            title="Действия"
                          >
                            ☰
                          </button>
                          
                          {activeDropdownId === bld.id && (
                            <div className="action-dropdown">
                              <button 
                                type="button" 
                                className="action-dropdown__item" 
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleBuildingClick(bld.name);
                                }}
                              >
                                Войти
                              </button>
                              <button 
                                type="button" 
                                className="action-dropdown__item" 
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenEdit(bld);
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
                                  handleDelete(bld.id);
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
export default ObjectDetailsPage;
