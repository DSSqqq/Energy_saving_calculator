import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  buildSectionFootprint,
  footprintGeometryKey,
  getFootprintBounds,
  type SectionFootprint,
} from './footprint';
import { buildRoofDimensions, drawRoofDimensionWithWitness, type RoofDimension } from './dimensionDraw';

export interface SectionSide {
  id: string;
  name: string;
  length: number;
  orientation: string;
}

export interface BuildingSectionItem {
  id: number;
  building: number;
  name: string;
  floors: number;
  height_outer: number;
  height_inner: number;
  wall_material: string;
  roof_type: string;
  roof_material: string;
  length: number;
  width: number;
  offset_x: number;
  offset_y: number;
  sides: SectionSide[];
  created_at: string;
}

interface BuildingCadViewerProps {
  sections: BuildingSectionItem[];
}

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSection(sec: BuildingSectionItem): BuildingSectionItem {
  return {
    ...sec,
    floors: Math.max(1, Math.round(toNum(sec.floors, 1))),
    height_outer: toNum(sec.height_outer, 3.5),
    height_inner: toNum(sec.height_inner, 3),
    length: toNum(sec.length, 10),
    width: toNum(sec.width, 10),
    offset_x: toNum(sec.offset_x, 0),
    offset_y: toNum(sec.offset_y, 0),
  };
}

function getGeometryKey(sections: BuildingSectionItem[]): string {
  return sections.map(s => footprintGeometryKey(s)).join('|');
}

function getBoundsSpan(sections: BuildingSectionItem[]): number {
  const footprints = sections.map(buildSectionFootprint);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;
  const bounds = getFootprintBounds(footprints);
  if (Number.isFinite(bounds.minX)) {
    minX = bounds.minX;
    maxX = bounds.maxX;
    minZ = bounds.minZ;
    maxZ = bounds.maxZ;
  }
  sections.forEach(sec => {
    const h = toNum(sec.height_outer, 3.5);
    if (h > maxY) maxY = h;
  });
  return Math.max(maxX - minX, maxZ - minZ, maxY, 1);
}

function computeWallNormal(v0: { x: number; z: number }, v1: { x: number; z: number }) {
  const ex = v1.x - v0.x;
  const ez = v1.z - v0.z;
  const len = Math.hypot(ex, ez) || 1;
  // Внешняя нормаль в плоскости XZ (перпендикуляр ребру)
  return { x: ez / len, y: 0, z: -ex / len };
}

function polygonCentroid(vertices: { x: number; z: number }[]) {
  let sx = 0;
  let sz = 0;
  vertices.forEach(v => {
    sx += v.x;
    sz += v.z;
  });
  return { x: sx / vertices.length, z: sz / vertices.length };
}

function addSectionFaces(
  faces: Face[],
  sec: BuildingSectionItem,
  footprint: SectionFootprint,
  wallColor: { r: number; g: number; b: number },
  roofColor: { r: number; g: number; b: number },
) {
  const h = sec.height_outer;
  const verts = footprint.vertices;
  const n = verts.length;

  // Пол
  faces.push({
    points: verts.map(v => ({ x: v.x, y: 0, z: v.z })),
    color: { r: 40, g: 50, b: 45 },
    normal: { x: 0, y: -1, z: 0 },
    sectionName: sec.name,
  });

  // Стены по каждому ребру контура
  footprint.edges.forEach(edge => {
    const v0 = verts[edge.v0];
    const v1 = verts[edge.v1];
    const normal = computeWallNormal(v0, v1);
    faces.push({
      points: [
        { x: v0.x, y: 0, z: v0.z },
        { x: v1.x, y: 0, z: v1.z },
        { x: v1.x, y: h, z: v1.z },
        { x: v0.x, y: h, z: v0.z },
      ],
      color: wallColor,
      normal,
      label: edge.label,
      floors: sec.floors,
      height: h,
    });
  });

  const roofType = sec.roof_type.toLowerCase();
  const topVerts = verts.map(v => ({ x: v.x, y: h, z: v.z }));

  if (roofType === 'двускатная' && n >= 4) {
    const ridgeY = h + 1.8;
    const c = polygonCentroid(verts);
    const ridge = { x: c.x, y: ridgeY, z: c.z };
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      faces.push({
        points: [
          { x: a.x, y: h, z: a.z },
          { x: b.x, y: h, z: b.z },
          ridge,
        ],
        color: roofColor,
        normal: { x: 0, y: 0.7, z: 0.7 },
        isRoof: true,
      });
    }
  } else if ((roofType === 'четырехскатная' || roofType === 'мансардная') && n >= 4) {
    const ridgeY = h + 2.0;
    const c = polygonCentroid(verts);
    const ridge = { x: c.x, y: ridgeY, z: c.z };
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      faces.push({
        points: [
          { x: a.x, y: h, z: a.z },
          { x: b.x, y: h, z: b.z },
          ridge,
        ],
        color: roofColor,
        normal: { x: 0, y: 0.7, z: 0.7 },
        isRoof: true,
      });
    }
  } else {
    faces.push({
      points: topVerts,
      color: roofColor,
      normal: { x: 0, y: 1, z: 0 },
      isRoof: true,
    });
  }
}

interface Face {
  points: { x: number; y: number; z: number }[];
  color: { r: number; g: number; b: number };
  normal: { x: number; y: number; z: number };
  label?: string;
  isRoof?: boolean;
  floors?: number;
  height?: number;
  sectionName?: string;
  avgZ?: number;
}

export function BuildingCadViewer({ sections }: BuildingCadViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayMode, setDisplayMode] = useState<'solid' | 'wireframe' | 'top'>('solid');
  
  // Camera state
  const [yaw, setYaw] = useState(Math.PI / 4); // 45 degrees
  const [pitch, setPitch] = useState(Math.PI / 6); // 30 degrees
  const [zoom, setZoom] = useState(15); // pixels per meter
  
  // Dragging state
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastGeometryKey = useRef('');

  const normalizedSections = useMemo(
    () => sections.map(normalizeSection),
    [sections],
  );

  const geometryKey = useMemo(
    () => getGeometryKey(normalizedSections),
    [normalizedSections],
  );

  // Подгоняем масштаб при изменении габаритов, чтобы модель всегда была видна
  useEffect(() => {
    if (normalizedSections.length === 0 || geometryKey === lastGeometryKey.current) return;
    lastGeometryKey.current = geometryKey;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxSpan = getBoundsSpan(normalizedSections);
    const fitZoom = Math.min(60, Math.max(8, Math.min(canvas.width, canvas.height) * 0.42 / maxSpan));
    setZoom(fitZoom);
  }, [geometryKey, normalizedSections]);

  // Reset camera view
  const handleResetCamera = () => {
    setYaw(Math.PI / 4);
    setPitch(Math.PI / 6);
    setZoom(15);
  };

  // Zoom control
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(5, Math.min(60, prev + delta)));
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (displayMode === 'top') return; // no rotation in top view
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || displayMode === 'top') return;
    
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    
    setYaw(prev => (prev + deltaX * 0.01) % (Math.PI * 2));
    setPitch(prev => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev + deltaY * 0.01)));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Helper to get base color by wall material
  const getMaterialColor = (material: string) => {
    switch (material.toLowerCase()) {
      case 'кирпич': return { r: 192, g: 80, b: 64 };
      case 'железобетон': return { r: 140, g: 145, b: 150 };
      case 'пеноблок': return { r: 210, g: 215, b: 210 };
      case 'дерево': return { r: 160, g: 112, b: 64 };
      case 'сендвич-панели': return { r: 70, g: 130, b: 180 };
      case 'монолит': return { r: 120, g: 125, b: 130 };
      default: return { r: 170, g: 170, b: 170 };
    }
  };

  // Helper to get roof color by material/type
  const getRoofColor = (material: string) => {
    switch (material.toLowerCase()) {
      case 'металлочерепица': return { r: 139, g: 26, b: 26 };
      case 'профнастил': return { r: 46, g: 92, b: 138 };
      case 'рулонная кровля': return { r: 60, g: 65, b: 70 };
      case 'шифер': return { r: 150, g: 155, b: 160 };
      default: return { r: 90, g: 95, b: 100 };
    }
  };

  // Renderer loop / redraw on state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    if (normalizedSections.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Нет секций для построения 3D CAD модели.', width / 2, height / 2);
      return;
    }

    // Calculate bounding box to center the model
    const footprints = normalizedSections.map(buildSectionFootprint);
    const bounds = getFootprintBounds(footprints);
    let minX = bounds.minX;
    let maxX = bounds.maxX;
    let minZ = bounds.minZ;
    let maxZ = bounds.maxZ;

    if (!Number.isFinite(minX)) {
      minX = maxX = minZ = maxZ = 0;
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Projection function (3D to 2D)
    const project = (x: number, y: number, z: number) => {
      // Offset by center
      const ox = x - centerX;
      const oy = y;
      const oz = z - centerZ;

      if (displayMode === 'top') {
        // Orthographic top view (look down Y axis)
        return {
          x: width / 2 + ox * zoom,
          y: height / 2 + oz * zoom,
          zDepth: oy
        };
      }

      // Rotate around Y axis (Yaw)
      const x1 = ox * Math.cos(yaw) - oz * Math.sin(yaw);
      const z1 = oz * Math.cos(yaw) + ox * Math.sin(yaw);
      const y1 = oy;

      // Rotate around X axis (Pitch)
      const x2 = x1;
      const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = z1 * Math.cos(pitch) + y1 * Math.sin(pitch);

      return {
        x: width / 2 + x2 * zoom,
        y: height / 2 - y2 * zoom, // invert Y for canvas
        zDepth: z2 // for Painter's algorithm
      };
    };

    const faces: Face[] = [];

    normalizedSections.forEach((sec, idx) => {
      const footprint = footprints[idx];
      const wallColor = getMaterialColor(sec.wall_material);
      const roofColor = getRoofColor(sec.roof_material);
      addSectionFaces(faces, sec, footprint, wallColor, roofColor);
    });

    // Calculate projected coordinates and average Z depth for sorting
    const projectedFaces = faces.map(face => {
      const projPoints = face.points.map(p => project(p.x, p.y, p.z));
      const avgZ = projPoints.reduce((sum, p) => sum + p.zDepth, 0) / projPoints.length;
      return { ...face, projPoints, avgZ };
    });

    // Sort faces from furthest to closest (Painter's algorithm)
    if (displayMode !== 'top') {
      projectedFaces.sort((a, b) => b.avgZ - a.avgZ);
    } else {
      // In top view, sort by Y height (ground first, then walls, then roof)
      projectedFaces.sort((a, b) => a.points[0].y - b.points[0].y);
    }

    // Light vector for shading (pointing down and left)
    const light = { x: -0.5, y: 0.7, z: 0.5 };
    const lightLen = Math.hypot(light.x, light.y, light.z);
    const lx = light.x / lightLen;
    const ly = light.y / lightLen;
    const lz = light.z / lightLen;

    // Draw faces
    projectedFaces.forEach(face => {
      if (face.projPoints.length < 3) return;

      // Calculate lighting (dot product of face normal and light vector)
      let lightFactor = 0.8; // ambient
      if (displayMode === 'solid') {
        // Normal vector dot product
        const dot = face.normal.x * lx + face.normal.y * ly + face.normal.z * lz;
        lightFactor = Math.max(0.3, Math.min(1.0, 0.6 + dot * 0.4));
      }

      const r = Math.round(face.color.r * lightFactor);
      const g = Math.round(face.color.g * lightFactor);
      const b = Math.round(face.color.b * lightFactor);

      ctx.beginPath();
      ctx.moveTo(face.projPoints[0].x, face.projPoints[0].y);
      for (let i = 1; i < face.projPoints.length; i++) {
        ctx.lineTo(face.projPoints[i].x, face.projPoints[i].y);
      }
      ctx.closePath();

      if (displayMode === 'solid' || displayMode === 'top') {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
        ctx.strokeStyle = displayMode === 'top' ? '#2ed38a' : `rgba(255, 255, 255, 0.15)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Wireframe
        ctx.strokeStyle = face.isRoof ? '#39e297' : '#2ed38a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw floor lines on walls
      if (face.floors && face.floors > 1 && face.height && displayMode !== 'top') {
        const floorHeight = face.height / face.floors;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        for (let f = 1; f < face.floors; f++) {
          const fy = f * floorHeight;
          const p1 = project(face.points[0].x, fy, face.points[0].z);
          const p2 = project(face.points[1].x, fy, face.points[1].z);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Название секции в 2D-плане
      if (displayMode === 'top' && face.sectionName) {
        const c = polygonCentroid(face.points.map(p => ({ x: p.x, z: p.z })));
        const labelPos = project(c.x, 0, c.z);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(face.sectionName, labelPos.x, labelPos.y);
      }
    });

    // Размерные линии на крыше каждой секции
    const allDimensions: RoofDimension[] = [];
    normalizedSections.forEach((sec, idx) => {
      const footprint = footprints[idx];
      const inset = displayMode === 'top' ? 0.55 : 0.4;
      allDimensions.push(...buildRoofDimensions(footprint, sec.height_outer, inset));
    });

    allDimensions.forEach(dim => {
      drawRoofDimensionWithWitness(ctx, project, dim, zoom);
    });

  }, [normalizedSections, displayMode, yaw, pitch, zoom]);

  return (
    <div className="cad-viewer-card">
      <header className="cad-viewer-card__header">
        <h3 className="cad-viewer-card__title">
          <span>📐</span> 3D CAD Модель здания
        </h3>
        <div className="cad-toolbar">
          <button 
            type="button" 
            className={`cad-btn ${displayMode === 'solid' ? 'cad-btn--active' : ''}`}
            onClick={() => setDisplayMode('solid')}
            title="Сплошная заливка с тенями"
          >
            Solid
          </button>
          <button 
            type="button" 
            className={`cad-btn ${displayMode === 'wireframe' ? 'cad-btn--active' : ''}`}
            onClick={() => setDisplayMode('wireframe')}
            title="Каркасный режим"
          >
            Wireframe
          </button>
          <button 
            type="button" 
            className={`cad-btn ${displayMode === 'top' ? 'cad-btn--active' : ''}`}
            onClick={() => setDisplayMode('top')}
            title="Ортографический вид сверху"
          >
            2D План
          </button>
        </div>
      </header>

      <div 
        className="cad-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} width={640} height={480} style={{ width: '100%', height: '100%', display: 'block' }} />
        
        <div className="cad-legend">
          <div className="cad-hint">
            {displayMode === 'top' ? 'Вид сверху (ортографический)' : '🖱️ Удерживайте мышь для вращения'}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', pointerEvents: 'auto' }}>
            <button type="button" className="cad-btn" onClick={() => handleZoom(5)} title="Приблизить">➕</button>
            <button type="button" className="cad-btn" onClick={() => handleZoom(-5)} title="Отдалить">➖</button>
            <button type="button" className="cad-btn" onClick={handleResetCamera} title="Сбросить ракурс">🔄 Сбросить</button>
          </div>
        </div>
      </div>
    </div>
  );
}
