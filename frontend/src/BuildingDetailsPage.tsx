import React, { useState, useEffect, useMemo } from 'react';
import { BuildingCadViewer, type BuildingSectionItem, type SectionSide } from './measures/cad/BuildingCadViewer';
import {
  computeJoinOffset,
  getOppositeOrientation,
  listJoinSideOptions,
  type JoinAlignment,
} from './measures/cad/footprint';
import { computeBuildingGeometryMetrics, formatMetric } from './measures/cad/geometryMetrics';

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

const WALL_MATERIAL_OPTIONS = ["Кирпич", "Железобетон", "Пеноблок", "Сендвич-панели", "Монолит", "Дерево"];
const ROOF_TYPE_OPTIONS = ["Плоская", "Двускатная", "Четырехскатная", "Мансардная"];
const ROOF_MATERIAL_OPTIONS = ["Рулонная кровля", "Металлочерепица", "Профнастил", "Шифер", "Ж/Б плиты"];
const SECTIONS_PER_PAGE = 5;

function deriveSectionDimensions(
  lengthStr: string,
  widthStr: string,
  sides: SectionSide[],
): { length: number; width: number } {
  let length = parseFloat(lengthStr) || 10;
  let width = parseFloat(widthStr) || 10;

  const northSouth = sides
    .filter(s => ['север', 'юг'].includes(s.orientation.toLowerCase()))
    .map(s => s.length)
    .filter(n => n > 0);
  const eastWest = sides
    .filter(s => ['восток', 'запад'].includes(s.orientation.toLowerCase()))
    .map(s => s.length)
    .filter(n => n > 0);

  if (northSouth.length > 0) length = Math.max(...northSouth);
  if (eastWest.length > 0) width = Math.max(...eastWest);

  return { length, width };
}

function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  if (Array.isArray(record.detail)) return record.detail.map(String).join('; ');
  const parts: string[] = [];
  for (const [key, val] of Object.entries(record)) {
    if (Array.isArray(val)) parts.push(`${key}: ${val.join(', ')}`);
    else if (typeof val === 'string') parts.push(`${key}: ${val}`);
  }
  return parts.length > 0 ? parts.join('; ') : fallback;
}

function buildDraftSectionFromForm(
  buildingId: number,
  editingSection: BuildingSectionItem | null,
  fields: {
    sectionName: string;
    sectionFloors: string;
    sectionHeightOuter: string;
    sectionHeightInner: string;
    sectionWallMaterial: string;
    sectionRoofType: string;
    sectionRoofMaterial: string;
    sectionLength: string;
    sectionWidth: string;
    sectionOffsetX: string;
    sectionOffsetY: string;
    sectionSides: SectionSide[];
  },
): BuildingSectionItem {
  const { length, width } = deriveSectionDimensions(
    fields.sectionLength,
    fields.sectionWidth,
    fields.sectionSides,
  );

  return {
    id: editingSection?.id ?? -1,
    building: buildingId,
    name: fields.sectionName || 'Секция',
    floors: parseInt(fields.sectionFloors, 10) || 1,
    height_outer: parseFloat(fields.sectionHeightOuter) || 3.5,
    height_inner: parseFloat(fields.sectionHeightInner) || 3,
    wall_material: fields.sectionWallMaterial,
    roof_type: fields.sectionRoofType,
    roof_material: fields.sectionRoofMaterial,
    length,
    width,
    offset_x: parseFloat(fields.sectionOffsetX) || 0,
    offset_y: parseFloat(fields.sectionOffsetY) || 0,
    sides: fields.sectionSides,
    created_at: editingSection?.created_at ?? '',
  };
}

export function BuildingDetailsPage({ buildingId, objectId, onBack }: BuildingDetailsPageProps) {
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo | null>(null);
  const [objectInfo, setObjectInfo] = useState<ObjectInfo | null>(null);
  const [sections, setSections] = useState<BuildingSectionItem[]>([]);
  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [doors, setDoors] = useState<DoorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown actions state
  const [activeDropdown, setActiveDropdown] = useState<{ type: 'window' | 'door' | 'section'; id: number } | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<number | null>(null);
  const [sectionPage, setSectionPage] = useState(1);

  // --- Section Forms State ---
  const [isSectionFormOpen, setIsSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<BuildingSectionItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'main' | 'heights' | 'materials' | 'sides'>('main');
  
  const [sectionName, setSectionName] = useState('');
  const [sectionFloors, setSectionFloors] = useState('1');
  const [sectionHeightOuter, setSectionHeightOuter] = useState('3.5');
  const [sectionHeightInner, setSectionHeightInner] = useState('3.0');
  const [sectionWallMaterial, setSectionWallMaterial] = useState(WALL_MATERIAL_OPTIONS[0]);
  const [sectionRoofType, setSectionRoofType] = useState(ROOF_TYPE_OPTIONS[0]);
  const [sectionRoofMaterial, setSectionRoofMaterial] = useState(ROOF_MATERIAL_OPTIONS[0]);
  const [sectionLength, setSectionLength] = useState('10');
  const [sectionWidth, setSectionWidth] = useState('10');
  const [sectionOffsetX, setSectionOffsetX] = useState('0');
  const [sectionOffsetY, setSectionOffsetY] = useState('0');
  const [sectionSides, setSectionSides] = useState<SectionSide[]>([]);
  const [joinEnabled, setJoinEnabled] = useState(false);
  const [joinTargetSectionId, setJoinTargetSectionId] = useState<number | null>(null);
  const [joinTargetSide, setJoinTargetSide] = useState('Восток');
  const [joinAttachSide, setJoinAttachSide] = useState('Запад');
  const [joinAlignment, setJoinAlignment] = useState<JoinAlignment>('center');
  const [joinSlide, setJoinSlide] = useState('0');
  const [sectionFormError, setSectionFormError] = useState('');
  const [sectionSubmitting, setSectionSubmitting] = useState(false);

  // --- Windows Forms State ---
  const [isWindowFormOpen, setIsWindowFormOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<WindowItem | null>(null);
  const [windowHeight, setWindowHeight] = useState('');
  const [windowWidth, setWindowWidth] = useState('');
  const [windowOrientation, setWindowOrientation] = useState(ORIENTATION_OPTIONS[0]);
  const [windowMaterial, setWindowMaterial] = useState(WINDOW_MATERIAL_OPTIONS[0]);
  const [windowGlazing, setWindowGlazing] = useState(GLAZING_OPTIONS[0]);
  const [windowFormError, setWindowFormError] = useState('');
  const [windowSubmitting, setWindowSubmitting] = useState(false);

  // --- Doors Forms State ---
  const [isDoorFormOpen, setIsDoorFormOpen] = useState(false);
  const [editingDoor, setEditingDoor] = useState<DoorItem | null>(null);
  const [doorHeight, setDoorHeight] = useState('');
  const [doorWidth, setDoorWidth] = useState('');
  const [doorOrientation, setDoorOrientation] = useState(ORIENTATION_OPTIONS[0]);
  const [doorMaterial, setDoorMaterial] = useState(DOOR_MATERIAL_OPTIONS[0]);
  const [doorFormError, setDoorFormError] = useState('');
  const [doorSubmitting, setDoorSubmitting] = useState(false);

  // Fetch all building elements and details
  const fetchAllData = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError('');
    try {
      const promises = [
        fetch(`/api/buildings/${buildingId}/`),
        fetch(`/api/objects/${objectId}/`),
        fetch(`/api/building-sections/?building=${buildingId}`),
        fetch(`/api/windows/?building=${buildingId}`),
        fetch(`/api/doors/?building=${buildingId}`)
      ];

      const [bldRes, objRes, secRes, winRes, doorRes] = await Promise.all(promises);

      if (!bldRes.ok || !objRes.ok || !secRes.ok || !winRes.ok || !doorRes.ok) {
        throw new Error('Не удалось загрузить данные здания');
      }

      const bldData = await bldRes.json();
      const objData = await objRes.json();
      const secData = await secRes.json();
      const winData = await winRes.json();
      const doorData = await doorRes.json();

      setBuildingInfo(bldData);
      setObjectInfo(objData);
      setSections(secData);
      setWindows(winData);
      setDoors(doorData);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [buildingId, objectId]);

  useEffect(() => {
    setSectionPage(1);
    setExpandedSectionId(null);
  }, [buildingId]);

  const sectionTotalPages = Math.max(1, Math.ceil(sections.length / SECTIONS_PER_PAGE));

  useEffect(() => {
    if (sectionPage > sectionTotalPages) {
      setSectionPage(sectionTotalPages);
    }
  }, [sectionPage, sectionTotalPages]);

  const paginatedSections = sections.slice(
    (sectionPage - 1) * SECTIONS_PER_PAGE,
    sectionPage * SECTIONS_PER_PAGE,
  );

  const goToSectionPage = (nextPage: number) => {
    setSectionPage(nextPage);
    setExpandedSectionId(null);
    setActiveDropdown(null);
  };

  useEffect(() => {
    if (paginatedSections.length === 0) {
      if (expandedSectionId !== null) setExpandedSectionId(null);
      return;
    }
    const expandedOnPage = expandedSectionId !== null
      && paginatedSections.some(s => s.id === expandedSectionId);
    if (!expandedOnPage) {
      setExpandedSectionId(paginatedSections[0].id);
    }
  }, [sectionPage, sections, expandedSectionId]);

  // Черновик секции для live-preview в 3D CAD пока открыта форма редактирования
  const formDraftFields = useMemo(() => ({
    sectionName,
    sectionFloors,
    sectionHeightOuter,
    sectionHeightInner,
    sectionWallMaterial,
    sectionRoofType,
    sectionRoofMaterial,
    sectionLength,
    sectionWidth,
    sectionOffsetX,
    sectionOffsetY,
    sectionSides,
  }), [
    sectionName, sectionFloors, sectionHeightOuter, sectionHeightInner,
    sectionWallMaterial, sectionRoofType, sectionRoofMaterial,
    sectionLength, sectionWidth, sectionOffsetX, sectionOffsetY, sectionSides,
  ]);

  const joinTargetCandidates = useMemo(
    () => sections.filter(s => s.id !== editingSection?.id),
    [sections, editingSection],
  );

  const joinTargetSection = joinTargetSectionId !== null
    ? sections.find(s => s.id === joinTargetSectionId) ?? null
    : null;

  const joinTargetSideOptions = joinTargetSection
    ? listJoinSideOptions(joinTargetSection)
    : [];

  const joinAttachSideOptions = listJoinSideOptions(
    buildDraftSectionFromForm(buildingId, editingSection, formDraftFields),
  );

  useEffect(() => {
    if (!isSectionFormOpen || !joinEnabled || !joinTargetSection) return;

    const draft = buildDraftSectionFromForm(buildingId, editingSection, {
      ...formDraftFields,
      sectionOffsetX: '0',
      sectionOffsetY: '0',
    });

    const offsets = computeJoinOffset(
      draft,
      joinTargetSection,
      joinTargetSide,
      joinAttachSide,
      joinAlignment,
      parseFloat(joinSlide) || 0,
    );
    if (!offsets) return;

    const ox = offsets.offset_x.toFixed(2);
    const oz = offsets.offset_y.toFixed(2);
    setSectionOffsetX(prev => (prev === ox ? prev : ox));
    setSectionOffsetY(prev => (prev === oz ? prev : oz));
  }, [
    isSectionFormOpen,
    joinEnabled,
    joinTargetSection,
    joinTargetSide,
    joinAttachSide,
    joinAlignment,
    joinSlide,
    buildingId,
    editingSection,
    formDraftFields,
  ]);

  const cadSections = useMemo((): BuildingSectionItem[] => {
    if (!isSectionFormOpen) return sections;

    const draft = buildDraftSectionFromForm(buildingId, editingSection, formDraftFields);

    if (editingSection) {
      return sections.map(s => (s.id === editingSection.id ? draft : s));
    }
    return [...sections, draft];
  }, [sections, isSectionFormOpen, editingSection, buildingId, formDraftFields]);

  const geometryMetrics = useMemo(
    () => computeBuildingGeometryMetrics(cadSections),
    [cadSections],
  );

  // --- Section Actions ---
  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setActiveModalTab('main');
    setSectionName(`Секция ${sections.length + 1}`);
    setSectionFloors('1');
    setSectionHeightOuter('3.5');
    setSectionHeightInner('3.0');
    setSectionWallMaterial(WALL_MATERIAL_OPTIONS[0]);
    setSectionRoofType(ROOF_TYPE_OPTIONS[0]);
    setSectionRoofMaterial(ROOF_MATERIAL_OPTIONS[0]);
    setSectionLength('12');
    setSectionWidth('8');

    const lastSec = sections.length > 0 ? sections[sections.length - 1] : null;
    setJoinEnabled(sections.length > 0);
    setJoinTargetSectionId(lastSec?.id ?? null);
    setJoinTargetSide('Восток');
    setJoinAttachSide('Запад');
    setJoinAlignment('center');
    setJoinSlide('0');
    setSectionOffsetX('0');
    setSectionOffsetY('0');

    // Generate default 4 sides
    setSectionSides([
      { id: '1', name: 'Главный фасад', length: 12, orientation: 'Север' },
      { id: '2', name: 'Задний фасад', length: 12, orientation: 'Юг' },
      { id: '3', name: 'Левая стена', length: 8, orientation: 'Запад' },
      { id: '4', name: 'Правая стена', length: 8, orientation: 'Восток' }
    ]);
    
    setSectionFormError('');
    setIsSectionFormOpen(true);
  };

  const handleOpenEditSection = (sec: BuildingSectionItem) => {
    setEditingSection(sec);
    setActiveModalTab('main');
    setSectionName(sec.name);
    setSectionFloors(sec.floors.toString());
    setSectionHeightOuter(sec.height_outer.toString());
    setSectionHeightInner(sec.height_inner.toString());
    setSectionWallMaterial(sec.wall_material);
    setSectionRoofType(sec.roof_type);
    setSectionRoofMaterial(sec.roof_material);
    setSectionLength(sec.length.toString());
    setSectionWidth(sec.width.toString());
    setSectionOffsetX(sec.offset_x.toString());
    setSectionOffsetY(sec.offset_y.toString());
    setSectionSides(sec.sides || []);
    setJoinEnabled(false);
    setJoinTargetSectionId(null);
    setJoinTargetSide('Восток');
    setJoinAttachSide('Запад');
    setJoinAlignment('center');
    setJoinSlide('0');
    setSectionFormError('');
    setIsSectionFormOpen(true);
  };

  const handleDeleteSection = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот участок здания?')) {
      return;
    }
    try {
      const res = await fetch(`/api/building-sections/${id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Не удалось удалить участок');
      if (expandedSectionId === id) setExpandedSectionId(null);
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  // Side Management in Modal
  const handleAddSide = () => {
    const newSide: SectionSide = {
      id: Date.now().toString(),
      name: `Стена ${sectionSides.length + 1}`,
      length: 5,
      orientation: ORIENTATION_OPTIONS[0]
    };
    setSectionSides([...sectionSides, newSide]);
  };

  const handleUpdateSide = (id: string, field: keyof SectionSide, value: any) => {
    setSectionSides(sectionSides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleRemoveSide = (id: string) => {
    setSectionSides(sectionSides.filter(s => s.id !== id));
  };

  const handleSectionFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sectionName.trim()) {
      setSectionFormError('Укажите название участка / секции.');
      setActiveModalTab('main');
      return;
    }

    const floors = parseInt(sectionFloors, 10);
    const hOuter = parseFloat(sectionHeightOuter);
    const hInner = parseFloat(sectionHeightInner);
    const { length: l, width: w } = deriveSectionDimensions(sectionLength, sectionWidth, sectionSides);
    const ox = parseFloat(sectionOffsetX);
    const oy = parseFloat(sectionOffsetY);

    if (isNaN(floors) || floors <= 0) {
      setSectionFormError('Укажите корректное количество этажей (вкладка «Высоты и этажность»).');
      setActiveModalTab('heights');
      return;
    }

    if (isNaN(hOuter) || hOuter <= 0 || isNaN(hInner) || hInner <= 0) {
      setSectionFormError('Укажите корректные высоты секции (вкладка «Высоты и этажность»).');
      setActiveModalTab('heights');
      return;
    }

    if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0) {
      setSectionFormError('Укажите корректные габариты секции (длина и ширина > 0).');
      setActiveModalTab('main');
      return;
    }

    if (hInner > hOuter) {
      setSectionFormError('Высота внутри не может быть больше высоты снаружи.');
      setActiveModalTab('heights');
      return;
    }

    if (joinEnabled && joinTargetCandidates.length > 0 && joinTargetSectionId === null) {
      setSectionFormError('Выберите секцию, к которой нужно пристыковать текущую.');
      setActiveModalTab('main');
      return;
    }

    const invalidSide = sectionSides.find(s => !s.name.trim() || !(Number(s.length) > 0));
    if (invalidSide) {
      setSectionFormError('У каждой стороны должны быть название и длина больше 0 (вкладка «Периметр и стороны»).');
      setActiveModalTab('sides');
      return;
    }

    if (editingSection && (!Number.isFinite(editingSection.id) || editingSection.id <= 0)) {
      setSectionFormError('Не удалось определить участок для сохранения. Закройте форму и откройте редактирование снова.');
      return;
    }

    setSectionFormError('');
    setSectionSubmitting(true);

    const url = editingSection ? `/api/building-sections/${editingSection.id}/` : '/api/building-sections/';
    const method = editingSection ? 'PATCH' : 'POST';
    const payload = {
      building: buildingId,
      name: sectionName.trim() || 'Секция здания',
      floors,
      height_outer: hOuter,
      height_inner: hInner,
      wall_material: sectionWallMaterial,
      roof_type: sectionRoofType,
      roof_material: sectionRoofMaterial,
      length: l,
      width: w,
      offset_x: isNaN(ox) ? 0 : ox,
      offset_y: isNaN(oy) ? 0 : oy,
      sides: sectionSides.map(s => ({
        ...s,
        length: Number(s.length),
      })),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = 'Ошибка сохранения участка здания';
        try {
          const data = await res.json();
          message = parseApiError(data, message);
        } catch {
          // ответ не JSON
        }
        throw new Error(message);
      }

      setEditingSection(null);
      setIsSectionFormOpen(false);
      await fetchAllData({ silent: true });
    } catch (err: any) {
      setSectionFormError(err.message || 'Ошибка отправки запроса');
    } finally {
      setSectionSubmitting(false);
    }
  };

  // --- Window Actions ---
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
    if (!window.confirm('Вы уверены, что хотите удалить это окно?')) return;
    try {
      const res = await fetch(`/api/windows/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить окно');
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

  // --- Door Actions ---
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
    if (!window.confirm('Вы уверены, что хотите удалить эту дверь?')) return;
    try {
      const res = await fetch(`/api/doors/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить дверь');
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
    <main className="app" onClick={() => setActiveDropdown(null)}>

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

      {/* --- Section Form Modal --- */}
      {isSectionFormOpen && (
        <div className="modal-overlay" onClick={() => { setIsSectionFormOpen(false); setEditingSection(null); }}>
          <div className="modal-card modal-card--large" onClick={(e) => e.stopPropagation()}>
            <header className="block__header" style={{ marginBottom: '1.5rem' }}>
              <h2>{editingSection ? 'Редактировать участок здания' : 'Добавить участок здания'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => { setIsSectionFormOpen(false); setEditingSection(null); }} title="Закрыть">
                ✕
              </button>
            </header>

            {sectionFormError && <div className="panel panel--error" style={{ marginBottom: '1.25rem' }}>{sectionFormError}</div>}

            {/* Modal Tabs */}
            <div className="modal-tabs">
              <button 
                type="button" 
                className={`modal-tab ${activeModalTab === 'main' ? 'modal-tab--active' : ''}`}
                onClick={() => setActiveModalTab('main')}
              >
                Основные габариты
              </button>
              <button 
                type="button" 
                className={`modal-tab ${activeModalTab === 'heights' ? 'modal-tab--active' : ''}`}
                onClick={() => setActiveModalTab('heights')}
              >
                Высоты и этажность
              </button>
              <button 
                type="button" 
                className={`modal-tab ${activeModalTab === 'materials' ? 'modal-tab--active' : ''}`}
                onClick={() => setActiveModalTab('materials')}
              >
                Конструкции
              </button>
              <button 
                type="button" 
                className={`modal-tab ${activeModalTab === 'sides' ? 'modal-tab--active' : ''}`}
                onClick={() => setActiveModalTab('sides')}
              >
                Периметр и стороны ({sectionSides.length})
              </button>
            </div>

            <form noValidate onSubmit={handleSectionFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {activeModalTab === 'main' && (
                <>
                  <div className="field">
                    <span>Название участка / секции *</span>
                    <input 
                      type="text" 
                      value={sectionName} 
                      onChange={(e) => setSectionName(e.target.value)} 
                      placeholder="Основной корпус, Пристройка, Секция А..."
                      required 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="field">
                      <span>Длина секции (м) *</span>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        value={sectionLength} 
                        onChange={(e) => setSectionLength(e.target.value)} 
                        placeholder="12" 
                        required 
                      />
                    </div>
                    <div className="field">
                      <span>Ширина секции (м) *</span>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        value={sectionWidth} 
                        onChange={(e) => setSectionWidth(e.target.value)} 
                        placeholder="8" 
                        required 
                      />
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#2ed38a', fontSize: '0.9rem' }}>Стыковка секций в 3D пространстве</h4>
                    <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                      Выберите секцию и стороны для стыковки. Для параллельных стен задайте позицию и сдвиг вдоль стены — секции встанут вплотную, без «диагонального» угла.
                    </p>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        className="checkbox--primary"
                        checked={joinEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setJoinEnabled(enabled);
                          if (enabled) {
                            if (joinTargetCandidates.length > 0 && joinTargetSectionId === null) {
                              const target = joinTargetCandidates[0];
                              setJoinTargetSectionId(target.id);
                              const opts = listJoinSideOptions(target);
                              const firstSide = opts[0]?.value ?? 'Восток';
                              setJoinTargetSide(firstSide);
                              setJoinAttachSide(getOppositeOrientation(firstSide));
                            }
                          } else {
                            setSectionOffsetX('0');
                            setSectionOffsetY('0');
                          }
                        }}
                        disabled={joinTargetCandidates.length === 0}
                      />
                      Пристыковать к существующей секции
                    </label>

                    {joinEnabled && joinTargetCandidates.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="field">
                          <span>Секция для стыковки *</span>
                          <select
                            value={joinTargetSectionId ?? ''}
                            onChange={(e) => {
                              const id = parseInt(e.target.value, 10);
                              setJoinTargetSectionId(Number.isFinite(id) ? id : null);
                              const target = sections.find(s => s.id === id);
                              if (target) {
                                const opts = listJoinSideOptions(target);
                                const firstSide = opts[0]?.value ?? 'Восток';
                                setJoinTargetSide(firstSide);
                                setJoinAttachSide(getOppositeOrientation(firstSide));
                              }
                            }}
                          >
                            {joinTargetCandidates.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                          <div className="field">
                            <span>Сторона выбранной секции (куда) *</span>
                            <select
                              value={joinTargetSide}
                              onChange={(e) => {
                                setJoinTargetSide(e.target.value);
                                setJoinAttachSide(getOppositeOrientation(e.target.value));
                              }}
                            >
                              {joinTargetSideOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <span>Сторона текущей секции (чем) *</span>
                            <select
                              value={joinAttachSide}
                              onChange={(e) => setJoinAttachSide(e.target.value)}
                            >
                              {joinAttachSideOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                          <div className="field">
                            <span>Позиция вдоль стены</span>
                            <select
                              value={joinAlignment}
                              onChange={(e) => setJoinAlignment(e.target.value as JoinAlignment)}
                            >
                              <option value="start">От начала стены</option>
                              <option value="center">По центру (рекомендуется)</option>
                              <option value="end">От конца стены</option>
                            </select>
                          </div>
                          <div className="field">
                            <span>Сдвиг вдоль стены (м)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={joinSlide}
                              onChange={(e) => setJoinSlide(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'rgba(46, 211, 138, 0.85)', background: 'rgba(46, 211, 138, 0.08)', border: '1px solid rgba(46, 211, 138, 0.2)', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
                          Смещение: X = {sectionOffsetX} м, Y/Z = {sectionOffsetY} м
                          <div style={{ marginTop: '0.35rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                            Боковая стыковка: противоположные стороны (Запад→Восток, Север→Юг). Г-образная: перпендикулярные (Юг→Восток).
                          </div>
                        </div>
                      </div>
                    )}

                    {!joinEnabled && (
                      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                        Секция размещается в начале координат (0, 0). Включите стыковку, если нужно присоединить к другому участку.
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeModalTab === 'heights' && (
                <>
                  <div className="field">
                    <span>Количество этажей секции *</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      value={sectionFloors} 
                      onChange={(e) => setSectionFloors(e.target.value)} 
                      placeholder="1" 
                      required 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="field">
                      <span>Высота снаружи (м) *</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="1" 
                        value={sectionHeightOuter} 
                        onChange={(e) => setSectionHeightOuter(e.target.value)} 
                        placeholder="3.5" 
                        required 
                      />
                    </div>
                    <div className="field">
                      <span>Высота внутри от пола до потолка (м) *</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="1" 
                        value={sectionHeightInner} 
                        onChange={(e) => setSectionHeightInner(e.target.value)} 
                        placeholder="3.0" 
                        required 
                      />
                    </div>
                  </div>
                </>
              )}

              {activeModalTab === 'materials' && (
                <>
                  <div className="field">
                    <span>Материал стен</span>
                    <select value={sectionWallMaterial} onChange={(e) => setSectionWallMaterial(e.target.value)}>
                      {WALL_MATERIAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="field">
                      <span>Тип крыши</span>
                      <select value={sectionRoofType} onChange={(e) => setSectionRoofType(e.target.value)}>
                        {ROOF_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <span>Материал крыши</span>
                      <select value={sectionRoofMaterial} onChange={(e) => setSectionRoofMaterial(e.target.value)}>
                        {ROOF_MATERIAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeModalTab === 'sides' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 600 }}>Настройка сторон и ориентации</span>
                    <button type="button" className="btn btn--primary btn--small" onClick={handleAddSide}>
                      + Добавить сторону
                    </button>
                  </div>

                  {sectionSides.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                      Стороны не указаны. Нажмите «+ Добавить сторону».
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {sectionSides.map((side) => (
                        <div key={side.id} className="side-input-row">
                          <div className="field" style={{ margin: 0 }}>
                            <span style={{ fontSize: '0.75rem' }}>Название</span>
                            <input 
                              type="text" 
                              value={side.name} 
                              onChange={(e) => handleUpdateSide(side.id, 'name', e.target.value)} 
                              placeholder="Фасад" 
                              required 
                            />
                          </div>
                          <div className="field" style={{ margin: 0 }}>
                            <span style={{ fontSize: '0.75rem' }}>Длина (м)</span>
                            <input 
                              type="number" 
                              step="0.1" 
                              min="0.1" 
                              value={side.length} 
                              onChange={(e) => handleUpdateSide(side.id, 'length', parseFloat(e.target.value) || 0)} 
                              required 
                            />
                          </div>
                          <div className="field" style={{ margin: 0 }}>
                            <span style={{ fontSize: '0.75rem' }}>Ориентация</span>
                            <select value={side.orientation} onChange={(e) => handleUpdateSide(side.id, 'orientation', e.target.value)}>
                              {ORIENTATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          <button 
                            type="button" 
                            className="btn-icon" 
                            style={{ color: '#ff5555', marginTop: '1.2rem' }} 
                            onClick={() => handleRemoveSide(side.id)} 
                            title="Удалить сторону"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '55%' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    * Обязательные поля
                  </span>
                  {sectionFormError && (
                    <div className="panel panel--error" style={{ margin: 0, fontSize: '0.85rem' }}>
                      {sectionFormError}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn--ghost" onClick={() => { setIsSectionFormOpen(false); setEditingSection(null); }}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={sectionSubmitting}>
                    {sectionSubmitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Window Form Modal --- */}
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

      {/* --- Door Form Modal --- */}
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
          {/* --- CAD Building Geometry Block --- */}
          <section className="block" style={{ marginBottom: '2.5rem' }}>
            <header className="block__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h2 style={{ margin: 0 }}>Геометрические параметры и конструкция здания</h2>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                  Секций / участков здания: {sections.length}
                </span>
              </div>
              <button type="button" className="btn btn--primary btn--small" onClick={handleOpenCreateSection}>
                + Добавить участок здания
              </button>
            </header>

            <div className="cad-grid">
              {/* Left Column: Sections List */}
              <div className="cad-sections-column cad-sections-card">
                <header className="cad-sections-card__header">
                  <h3 className="cad-sections-card__title">
                    <span>🧱</span> Секции здания
                  </h3>
                  <span className="cad-sections-card__count">
                    {sections.length} {sections.length === 1 ? 'участок' : sections.length >= 2 && sections.length <= 4 ? 'участка' : 'участков'}
                  </span>
                </header>
                <div className="cad-sections-list">
                {sections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>
                      Геометрия здания еще не задана. Добавьте один или несколько участков (например, разновысотные секции), чтобы настроить параметры стен, крыш и сторон.
                    </p>
                    <button type="button" className="btn btn--primary btn--small" onClick={handleOpenCreateSection}>
                      + Добавить участок
                    </button>
                  </div>
                ) : (
                  paginatedSections.map((sec) => {
                    const isExpanded = expandedSectionId === sec.id;
                    return (
                    <div
                      key={sec.id}
                      className={`section-item${isExpanded ? ' section-item--expanded' : ''}`}
                      style={{ zIndex: activeDropdown && activeDropdown.type === 'section' && activeDropdown.id === sec.id ? 100 : 1 }}
                    >
                      <button
                        type="button"
                        className={`section-tab${isExpanded ? ' section-tab--active' : ''}`}
                        onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
                        aria-expanded={isExpanded}
                      >
                        <span className="section-tab__icon">🧱</span>
                        <span className="section-tab__name">{sec.name}</span>
                        <span className="section-tab__meta">({sec.floors} эт.) · {sec.length}×{sec.width} м</span>
                        <span className="section-tab__chevron" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                      </button>

                      {isExpanded && (
                      <div className="section-card section-card--expanded">
                        <header className="section-card__header">
                          <h3 className="section-card__title">
                            <span>🧱</span> {sec.name} <span style={{ fontSize: '0.85rem', color: '#2ed38a', fontWeight: 600 }}>({sec.floors} эт.)</span>
                          </h3>
                          <div
                            className="section-card__actions"
                            style={{ position: 'relative', zIndex: activeDropdown && activeDropdown.type === 'section' && activeDropdown.id === sec.id ? 101 : 1 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => setActiveDropdown(activeDropdown && activeDropdown.type === 'section' && activeDropdown.id === sec.id ? null : { type: 'section', id: sec.id })}
                              title="Действия"
                            >
                              ☰
                            </button>
                            {activeDropdown && activeDropdown.type === 'section' && activeDropdown.id === sec.id && (
                              <div className="action-dropdown">
                                <button
                                  type="button"
                                  className="action-dropdown__item"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setActiveDropdown(null);
                                    handleOpenEditSection(sec);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(null);
                                    handleOpenEditSection(sec);
                                  }}
                                >
                                  Редактировать
                                </button>
                                <div className="action-dropdown__divider" />
                                <button
                                  type="button"
                                  className="action-dropdown__item action-dropdown__item--danger"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setActiveDropdown(null);
                                    handleDeleteSection(sec.id);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(null);
                                    handleDeleteSection(sec.id);
                                  }}
                                >
                                  Удалить
                                </button>
                              </div>
                            )}
                          </div>
                        </header>

                        <div className="section-card__grid">
                          <div className="section-card__param">
                            <span className="section-card__label">Габариты (Д×Ш)</span>
                            <span className="section-card__value">{sec.length}м × {sec.width}м</span>
                          </div>
                          <div className="section-card__param">
                            <span className="section-card__label">Высота (внеш / внутр)</span>
                            <span className="section-card__value">{sec.height_outer}м / {sec.height_inner}м</span>
                          </div>
                          <div className="section-card__param">
                            <span className="section-card__label">Материал стен</span>
                            <span className="section-card__value">{sec.wall_material}</span>
                          </div>
                          <div className="section-card__param">
                            <span className="section-card__label">Крыша ({sec.roof_type})</span>
                            <span className="section-card__value">{sec.roof_material}</span>
                          </div>
                        </div>

                        <div className="section-card__sides">
                          <div className="section-card__sides-title">Периметр и стороны ({sec.sides?.length || 0}):</div>
                          <div className="sides-badges">
                            {sec.sides && sec.sides.length > 0 ? (
                              sec.sides.map(s => (
                                <span key={s.id} className="side-badge">
                                  {s.orientation}: {s.length}м ({s.name})
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '0.85rem' }}>Стороны не заданы</span>
                            )}
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                    );
                  })
                )}
                </div>

                {sections.length > SECTIONS_PER_PAGE && (
                  <div className="cad-sections-pagination">
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      disabled={sectionPage === 1}
                      onClick={() => goToSectionPage(sectionPage - 1)}
                    >
                      ← Назад
                    </button>
                    <span className="cad-sections-pagination__info">
                      Страница {sectionPage} из {sectionTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      disabled={sectionPage === sectionTotalPages}
                      onClick={() => goToSectionPage(sectionPage + 1)}
                    >
                      Вперед →
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: 3D CAD Canvas Viewer */}
              <BuildingCadViewer sections={cadSections} />
            </div>
          </section>

          <section className="block geometry-metrics-block" style={{ marginBottom: '2.5rem' }}>
            <header className="block__header" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0 }}>Расчёт геометрии здания</h2>
              <p className="geometry-metrics-block__hint">
                Площадь стен — по длине и высоте каждой стороны контура; стыки между секциями не учитываются.
                Объём — площадь контура секции × высота (не по габаритному прямоугольнику).
              </p>
            </header>

            {cadSections.length === 0 ? (
              <div className="geometry-metrics-block__empty">
                Добавьте секции здания, чтобы увидеть расчёт.
              </div>
            ) : (
              <>
                <ul className="geometry-metrics-kpis">
                  <li className="geometry-metrics-kpi">
                    <span className="geometry-metrics-kpi__label">Площадь наружных стен</span>
                    <strong className="geometry-metrics-kpi__value">
                      {formatMetric(geometryMetrics.totalExteriorWallArea)} м²
                    </strong>
                  </li>
                  <li className="geometry-metrics-kpi">
                    <span className="geometry-metrics-kpi__label">Строительный объём</span>
                    <strong className="geometry-metrics-kpi__value">
                      {formatMetric(geometryMetrics.totalVolume)} м³
                    </strong>
                  </li>
                  <li className="geometry-metrics-kpi">
                    <span className="geometry-metrics-kpi__label">Площадь контуров</span>
                    <strong className="geometry-metrics-kpi__value">
                      {formatMetric(geometryMetrics.totalFootprintArea)} м²
                    </strong>
                  </li>
                  {geometryMetrics.totalJunctionWallArea > 0 && (
                    <li className="geometry-metrics-kpi geometry-metrics-kpi--muted">
                      <span className="geometry-metrics-kpi__label">Исключено (стыки секций)</span>
                      <strong className="geometry-metrics-kpi__value">
                        {formatMetric(geometryMetrics.totalJunctionWallArea)} м²
                      </strong>
                    </li>
                  )}
                </ul>

                {geometryMetrics.sections.length > 1 && (
                  <div className="results-table-wrap" style={{ marginTop: '1.25rem' }}>
                    <table className="results-table geometry-metrics-table">
                      <thead>
                        <tr>
                          <th>Секция</th>
                          <th>Контур, м²</th>
                          <th>Высота, м</th>
                          <th>Стены, м²</th>
                          <th>Объём, м³</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geometryMetrics.sections.map(row => (
                          <tr key={row.sectionId}>
                            <td>{row.sectionName}</td>
                            <td>{formatMetric(row.footprintArea)}</td>
                            <td>{formatMetric(row.height, 1)}</td>
                            <td>{formatMetric(row.exteriorWallArea)}</td>
                            <td>{formatMetric(row.volume)}</td>
                          </tr>
                        ))}
                        <tr className="results-table__total">
                          <td>Итого</td>
                          <td>{formatMetric(geometryMetrics.totalFootprintArea)}</td>
                          <td>—</td>
                          <td>{formatMetric(geometryMetrics.totalExteriorWallArea)}</td>
                          <td>{formatMetric(geometryMetrics.totalVolume)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          {/* --- Windows Block --- */}
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
                        <td style={{ textAlign: 'right', position: 'relative', zIndex: activeDropdown && activeDropdown.type === 'window' && activeDropdown.id === win.id ? 101 : 1 }} onClick={(e) => e.stopPropagation()}>
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
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActiveDropdown(null);
                                  handleOpenEditWindow(win);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActiveDropdown(null);
                                  handleDeleteWindow(win.id);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
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

          {/* --- Doors Block --- */}
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
                        <td style={{ textAlign: 'right', position: 'relative', zIndex: activeDropdown && activeDropdown.type === 'door' && activeDropdown.id === door.id ? 101 : 1 }} onClick={(e) => e.stopPropagation()}>
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
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActiveDropdown(null);
                                  handleOpenEditDoor(door);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActiveDropdown(null);
                                  handleDeleteDoor(door.id);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
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
