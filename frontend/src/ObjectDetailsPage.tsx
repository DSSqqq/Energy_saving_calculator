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
  onOpenBuilding: (buildingId: number) => void;
}

export function ObjectDetailsPage({ objectId, onBack, onOpenBuilding }: ObjectDetailsPageProps) {
  const cachedObject = ((window as any).__objectCache || {})[objectId];
  const [objectInfo, setObjectInfo] = useState<GeoObject | null>(cachedObject || null);
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
      const promises: Promise<Response>[] = [];
      let objPromise: Promise<Response> | null = null;

      // 1. Fetch Object Details if not already fetched
      if (!objectInfo) {
        objPromise = fetch(`/api/objects/${objectId}/`);
        promises.push(objPromise);
      }

      // 2. Fetch Buildings
      const buildPromise = fetch(`/api/buildings/?object=${objectId}&page=${pageNumber}`);
      promises.push(buildPromise);

      await Promise.all(promises);

      if (objPromise) {
        const objRes = await objPromise;
        if (!objRes.ok) {
          throw new Error('Не удалось загрузить информацию об объекте');
        }
        const objData = await objRes.json();
        setObjectInfo(objData);
        // Cache it globally
        if (!(window as any).__objectCache) {
          (window as any).__objectCache = {};
        }
        (window as any).__objectCache[objectId] = objData;
      }

      const buildRes = await buildPromise;
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

  const handleBuildingClick = (bldId: number) => {
    onOpenBuilding(bldId);
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
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
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



      {/* Building Form (Create/Edit Modal) */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="block__header" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{editingBuilding ? 'Редактировать здание' : 'Добавить новое здание'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsFormOpen(false)} title="Закрыть">
                ✕
              </button>
            </header>
            
            {formError && <div className="panel panel--error" style={{ marginBottom: '1.25rem' }}>{formError}</div>}
            
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setIsFormOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error ? (
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
                      <tr key={bld.id} style={{ cursor: 'pointer' }} onClick={() => handleBuildingClick(bld.id)}>
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
                                  handleBuildingClick(bld.id);
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
