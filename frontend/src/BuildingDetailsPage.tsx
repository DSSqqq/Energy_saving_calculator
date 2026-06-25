import React, { useState, useEffect } from 'react';

interface WindowItem {
  id: number;
  building: number;
  height: number;
  width: number;
  orientation: string;
  material: string;
  glazing: string;
  created_at: string;
}

interface DoorItem {
  id: number;
  building: number;
  height: number;
  width: number;
  orientation: string;
  material: string;
  created_at: string;
}

interface BuildingInfo {
  id: number;
  object: number;
  name: string;
  created_at: string;
}

interface ObjectInfo {
  id: number;
  name: string;
  contract_number: string;
}

interface BuildingDetailsPageProps {
  buildingId: number;
  objectId: number;
  onBack: () => void;
}

const ORIENTATION_OPTIONS = [
  "Север",
  "Юг",
  "Восток",
  "Запад",
  "Северо-Восток",
  "Северо-Запад",
  "Юго-Восток",
  "Юго-Запад"
];

const WINDOW_MATERIAL_OPTIONS = ["ПВХ", "Дерево", "Алюминий"];
const GLAZING_OPTIONS = ["Одинарное", "Двойное", "Тройное", "Двойное энергосберегающее"];
const DOOR_MATERIAL_OPTIONS = ["Дерево", "Металл", "ПВХ", "Утепленная"];

export function BuildingDetailsPage({ buildingId, objectId, onBack }: BuildingDetailsPageProps) {
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo | null>(null);
  const [objectInfo, setObjectInfo] = useState<ObjectInfo | null>(null);
  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [doors, setDoors] = useState<DoorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown actions state
  const [activeDropdown, setActiveDropdown] = useState<{ type: 'window' | 'door'; id: number } | null>(null);

  // Forms State
  const [isWindowFormOpen, setIsWindowFormOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<WindowItem | null>(null);
  const [windowHeight, setWindowHeight] = useState('');
  const [windowWidth, setWindowWidth] = useState('');
  const [windowOrientation, setWindowOrientation] = useState(ORIENTATION_OPTIONS[0]);
  const [windowMaterial, setWindowMaterial] = useState(WINDOW_MATERIAL_OPTIONS[0]);
  const [windowGlazing, setWindowGlazing] = useState(GLAZING_OPTIONS[0]);
  const [windowFormError, setWindowFormError] = useState('');
  const [windowSubmitting, setWindowSubmitting] = useState(false);

  const [isDoorFormOpen, setIsDoorFormOpen] = useState(false);
  const [editingDoor, setEditingDoor] = useState<DoorItem | null>(null);
  const [doorHeight, setDoorHeight] = useState('');
  const [doorWidth, setDoorWidth] = useState('');
  const [doorOrientation, setDoorOrientation] = useState(ORIENTATION_OPTIONS[0]);
  const [doorMaterial, setDoorMaterial] = useState(DOOR_MATERIAL_OPTIONS[0]);
  const [doorFormError, setDoorFormError] = useState('');
  const [doorSubmitting, setDoorSubmitting] = useState(false);

  // Fetch all building elements and details
  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const promises = [
        fetch(`/api/buildings/${buildingId}/`),
        fetch(`/api/objects/${objectId}/`),
        fetch(`/api/windows/?building=${buildingId}`),
        fetch(`/api/doors/?building=${buildingId}`)
      ];

      const [bldRes, objRes, winRes, doorRes] = await Promise.all(promises);

      if (!bldRes.ok || !objRes.ok || !winRes.ok || !doorRes.ok) {
        throw new Error('Не удалось загрузить данные здания');
      }

      const bldData = await bldRes.json();
      const objData = await objRes.json();
      const winData = await winRes.json();
      const doorData = await doorRes.json();

      setBuildingInfo(bldData);
      setObjectInfo(objData);
      setWindows(winData);
      setDoors(doorData);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [buildingId, objectId]);

  // Window Actions
  const handleOpenCreateWindow = () => {
    setEditingWindow(null);
    setWindowHeight('');
    setWindowWidth('');
    setWindowOrientation(ORIENTATION_OPTIONS[0]);
    setWindowMaterial(WINDOW_MATERIAL_OPTIONS[0]);
    setWindowGlazing(GLAZING_OPTIONS[0]);
    setWindowFormError('');
    setIsWindowFormOpen(true);
  };

  const handleOpenEditWindow = (win: WindowItem) => {
    setEditingWindow(win);
    setWindowHeight(win.height.toString());
    setWindowWidth(win.width.toString());
    setWindowOrientation(win.orientation);
    setWindowMaterial(win.material);
    setWindowGlazing(win.glazing);
    setWindowFormError('');
    setIsWindowFormOpen(true);
  };

  const handleDeleteWindow = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это окно?')) {
      return;
    }
    try {
      const res = await fetch(`/api/windows/${id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Не удалось удалить окно');
      }
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  const handleWindowFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(windowHeight);
    const w = parseFloat(windowWidth);
    if (isNaN(h) || h <= 0 || isNaN(w) || w <= 0) {
      setWindowFormError('Высота и ширина должны быть положительными числами');
      return;
    }
    setWindowFormError('');
    setWindowSubmitting(true);

    const url = editingWindow ? `/api/windows/${editingWindow.id}/` : '/api/windows/';
    const method = editingWindow ? 'PUT' : 'POST';
    const payload = {
      building: buildingId,
      height: h,
      width: w,
      orientation: windowOrientation,
      material: windowMaterial,
      glazing: windowGlazing
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Ошибка сохранения');
      }

      setIsWindowFormOpen(false);
      fetchAllData();
    } catch (err: any) {
      setWindowFormError(err.message || 'Ошибка отправки запроса');
    } finally {
      setWindowSubmitting(false);
    }
  };

  // Door Actions
  const handleOpenCreateDoor = () => {
    setEditingDoor(null);
    setDoorHeight('');
    setDoorWidth('');
    setDoorOrientation(ORIENTATION_OPTIONS[0]);
    setDoorMaterial(DOOR_MATERIAL_OPTIONS[0]);
    setDoorFormError('');
    setIsDoorFormOpen(true);
  };

  const handleOpenEditDoor = (door: DoorItem) => {
    setEditingDoor(door);
    setDoorHeight(door.height.toString());
    setDoorWidth(door.width.toString());
    setDoorOrientation(door.orientation);
    setDoorMaterial(door.material);
    setDoorFormError('');
    setIsDoorFormOpen(true);
  };

  const handleDeleteDoor = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту дверь?')) {
      return;
    }
    try {
      const res = await fetch(`/api/doors/${id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Не удалось удалить дверь');
      }
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  const handleDoorFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(doorHeight);
    const w = parseFloat(doorWidth);
    if (isNaN(h) || h <= 0 || isNaN(w) || w <= 0) {
      setDoorFormError('Высота и ширина должны быть положительными числами');
      return;
    }
    setDoorFormError('');
    setDoorSubmitting(true);

    const url = editingDoor ? `/api/doors/${editingDoor.id}/` : '/api/doors/';
    const method = editingDoor ? 'PUT' : 'POST';
    const payload = {
      building: buildingId,
      height: h,
      width: w,
      orientation: doorOrientation,
      material: doorMaterial
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Ошибка сохранения');
      }

      setIsDoorFormOpen(false);
      fetchAllData();
    } catch (err: any) {
      setDoorFormError(err.message || 'Ошибка отправки запроса');
    } finally {
      setDoorSubmitting(false);
    }
  };

  return (
    <main className="app">
      {activeDropdown !== null && (
        <div 
          className="dropdown-backdrop" 
          onClick={() => setActiveDropdown(null)} 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, background: 'transparent' }}
        />
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      <header className="app__header" style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <span className="title-icon">🏢</span>{buildingInfo ? buildingInfo.name : 'Загрузка здания...'}
        </h1>
      </header>

      <div className="breadcrumbs">
        <a href="#/" className="breadcrumbs__item">Главная</a>
        <span className="breadcrumbs__separator">/</span>
        <a href="#/objects" className="breadcrumbs__item">Объекты</a>
        <span className="breadcrumbs__separator">/</span>
        <span className="breadcrumbs__item" onClick={onBack}>
          {objectInfo ? objectInfo.name : '...'}
        </span>
        <span className="breadcrumbs__separator">/</span>
        <span className="breadcrumbs__item breadcrumbs__item--active">
          {buildingInfo ? buildingInfo.name : '...'}
        </span>
      </div>

      {objectInfo && (
        <p style={{ marginTop: '-1.25rem', marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500, fontSize: '0.95rem' }}>
          Объект: {objectInfo.name} {objectInfo.contract_number ? `(Договор: ${objectInfo.contract_number})` : ''}
        </p>
      )}

      {/* Window Form Card */}
      {isWindowFormOpen && (
        <div className="modal-overlay" onClick={() => setIsWindowFormOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="block__header" style={{ marginBottom: '1.5rem' }}>
              <h2>{editingWindow ? 'Редактировать окно' : 'Добавить новое окно'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsWindowFormOpen(false)} title="Закрыть">
                ✕
              </button>
            </header>
            
            {windowFormError && <div className="panel panel--error" style={{ marginBottom: '1.25rem' }}>{windowFormError}</div>}
            
            <form onSubmit={handleWindowFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="field">
                <span>Высота (м) *</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.1"
                  max="10"
                  value={windowHeight} 
                  onChange={(e) => setWindowHeight(e.target.value)} 
                  placeholder="1.5"
                  required 
                />
              </div>
              <div className="field">
                <span>Ширина (м) *</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.1"
                  max="10"
                  value={windowWidth} 
                  onChange={(e) => setWindowWidth(e.target.value)} 
                  placeholder="1.2"
                  required 
                />
              </div>
              <div className="field">
                <span>Ориентация</span>
                <select value={windowOrientation} onChange={(e) => setWindowOrientation(e.target.value)}>
                  {ORIENTATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="field">
                <span>Материал</span>
                <select value={windowMaterial} onChange={(e) => setWindowMaterial(e.target.value)}>
                  {WINDOW_MATERIAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="field">
                <span>Остекление</span>
                <select value={windowGlazing} onChange={(e) => setWindowGlazing(e.target.value)}>
                  {GLAZING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setIsWindowFormOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn--primary" disabled={windowSubmitting}>
                  {windowSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Door Form Card */}
      {isDoorFormOpen && (
        <div className="modal-overlay" onClick={() => setIsDoorFormOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="block__header" style={{ marginBottom: '1.5rem' }}>
              <h2>{editingDoor ? 'Редактировать дверь' : 'Добавить новую дверь'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsDoorFormOpen(false)} title="Закрыть">
                ✕
              </button>
            </header>
            
            {doorFormError && <div className="panel panel--error" style={{ marginBottom: '1.25rem' }}>{doorFormError}</div>}
            
            <form onSubmit={handleDoorFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="field">
                <span>Высота (м) *</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.1"
                  max="10"
                  value={doorHeight} 
                  onChange={(e) => setDoorHeight(e.target.value)} 
                  placeholder="2.1"
                  required 
                />
              </div>
              <div className="field">
                <span>Ширина (м) *</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.1"
                  max="10"
                  value={doorWidth} 
                  onChange={(e) => setDoorWidth(e.target.value)} 
                  placeholder="0.9"
                  required 
                />
              </div>
              <div className="field">
                <span>Ориентация</span>
                <select value={doorOrientation} onChange={(e) => setDoorOrientation(e.target.value)}>
                  {ORIENTATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="field">
                <span>Материал</span>
                <select value={doorMaterial} onChange={(e) => setDoorMaterial(e.target.value)}>
                  {DOOR_MATERIAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setIsDoorFormOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn--primary" disabled={doorSubmitting}>
                  {doorSubmitting ? 'Сохранение...' : 'Сохранить'}
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
        <>
          {/* Windows Block */}
          <section className="block" style={{ marginBottom: '2rem' }}>
            <header className="block__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h2 style={{ margin: 0 }}>Окна в здании</h2>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                  Всего окон: {windows.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button type="button" className="btn btn--primary btn--small" onClick={handleOpenCreateWindow}>
                  + Добавить окно
                </button>
              </div>
            </header>

            {windows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                В здании еще нет окон. Нажмите «+ Добавить окно», чтобы начать.
              </div>
            ) : (
              <div className="results-table-wrap">
                <table className="invest-table">
                  <thead>
                    <tr>
                      <th>Высота (м)</th>
                      <th>Ширина (м)</th>
                      <th>Ориентация</th>
                      <th>Материал</th>
                      <th>Остекление</th>
                      <th>Дата добавления</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {windows.map((win) => (
                      <tr key={win.id}>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{win.height} м</td>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{win.width} м</td>
                        <td>{win.orientation}</td>
                        <td>{win.material}</td>
                        <td>{win.glazing}</td>
                        <td style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                          {new Date(win.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ textAlign: 'right', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button" 
                            className="btn-icon" 
                            onClick={() => setActiveDropdown(activeDropdown && activeDropdown.type === 'window' && activeDropdown.id === win.id ? null : { type: 'window', id: win.id })}
                            title="Действия"
                          >
                            ☰
                          </button>
                          
                          {activeDropdown && activeDropdown.type === 'window' && activeDropdown.id === win.id && (
                            <div className="action-dropdown">
                              <button 
                                type="button" 
                                className="action-dropdown__item" 
                                onClick={() => {
                                  setActiveDropdown(null);
                                  handleOpenEditWindow(win);
                                }}
                              >
                                Редактировать
                              </button>
                              <div className="action-dropdown__divider" />
                              <button 
                                type="button" 
                                className="action-dropdown__item action-dropdown__item--danger" 
                                onClick={() => {
                                  setActiveDropdown(null);
                                  handleDeleteWindow(win.id);
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
            )}
          </section>

          {/* Doors Block */}
          <section className="block">
            <header className="block__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h2 style={{ margin: 0 }}>Двери в здании</h2>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                  Всего дверей: {doors.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button type="button" className="btn btn--primary btn--small" onClick={handleOpenCreateDoor}>
                  + Добавить дверь
                </button>
              </div>
            </header>

            {doors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                В здании еще нет дверей. Нажмите «+ Добавить дверь», чтобы начать.
              </div>
            ) : (
              <div className="results-table-wrap">
                <table className="invest-table">
                  <thead>
                    <tr>
                      <th>Высота (м)</th>
                      <th>Ширина (м)</th>
                      <th>Ориентация</th>
                      <th>Материал</th>
                      <th>Дата добавления</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doors.map((door) => (
                      <tr key={door.id}>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{door.height} м</td>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{door.width} м</td>
                        <td>{door.orientation}</td>
                        <td>{door.material}</td>
                        <td style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                          {new Date(door.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ textAlign: 'right', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button" 
                            className="btn-icon" 
                            onClick={() => setActiveDropdown(activeDropdown && activeDropdown.type === 'door' && activeDropdown.id === door.id ? null : { type: 'door', id: door.id })}
                            title="Действия"
                          >
                            ☰
                          </button>
                          
                          {activeDropdown && activeDropdown.type === 'door' && activeDropdown.id === door.id && (
                            <div className="action-dropdown">
                              <button 
                                type="button" 
                                className="action-dropdown__item" 
                                onClick={() => {
                                  setActiveDropdown(null);
                                  handleOpenEditDoor(door);
                                }}
                              >
                                Редактировать
                              </button>
                              <div className="action-dropdown__divider" />
                              <button 
                                type="button" 
                                className="action-dropdown__item action-dropdown__item--danger" 
                                onClick={() => {
                                  setActiveDropdown(null);
                                  handleDeleteDoor(door.id);
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
            )}
          </section>
        </>
      )}
    </main>
  );
}
