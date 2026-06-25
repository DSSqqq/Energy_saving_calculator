import React, { useState, useEffect, useRef } from 'react';

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

    if (sections.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Нет секций для построения 3D CAD модели.', width / 2, height / 2);
      return;
    }

    // Calculate bounding box to center the model
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    sections.forEach(sec => {
      const x1 = sec.offset_x;
      const x2 = sec.offset_x + sec.length;
      const z1 = sec.offset_y;
      const z2 = sec.offset_y + sec.width;
      if (x1 < minX) minX = x1;
      if (x2 > maxX) maxX = x2;
      if (z1 < minZ) minZ = z1;
      if (z2 > maxZ) maxZ = z2;
    });

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

    // Prepare faces for Painter's algorithm
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

    const faces: Face[] = [];

    // Build faces for each section
    sections.forEach(sec => {
      const x1 = sec.offset_x;
      const x2 = sec.offset_x + sec.length;
      const z1 = sec.offset_y;
      const z2 = sec.offset_y + sec.width;
      const h = sec.height_outer;
      const wallColor = getMaterialColor(sec.wall_material);
      const roofColor = getRoofColor(sec.roof_material);

      // Find specific sides for labels if provided
      const getSideLabel = (defaultOrient: string, defaultLen: number) => {
        const custom = sec.sides?.find(s => s.orientation.toLowerCase() === defaultOrient.toLowerCase());
        if (custom) {
          return `${custom.orientation}: ${custom.length}м (${custom.name})`;
        }
        return `${defaultOrient}: ${defaultLen}м`;
      };

      // 1. Bottom face (ground floor)
      faces.push({
        points: [{ x: x1, y: 0, z: z1 }, { x: x2, y: 0, z: z1 }, { x: x2, y: 0, z: z2 }, { x: x1, y: 0, z: z2 }],
        color: { r: 40, g: 50, b: 45 },
        normal: { x: 0, y: -1, z: 0 },
        sectionName: sec.name
      });

      // 2. South Wall (z = z2)
      faces.push({
        points: [{ x: x1, y: 0, z: z2 }, { x: x2, y: 0, z: z2 }, { x: x2, y: h, z: z2 }, { x: x1, y: h, z: z2 }],
        color: wallColor,
        normal: { x: 0, y: 0, z: 1 },
        label: getSideLabel('Юг', sec.length),
        floors: sec.floors,
        height: h
      });

      // 3. North Wall (z = z1)
      faces.push({
        points: [{ x: x2, y: 0, z: z1 }, { x: x1, y: 0, z: z1 }, { x: x1, y: h, z: z1 }, { x: x2, y: h, z: z1 }],
        color: wallColor,
        normal: { x: 0, y: 0, z: -1 },
        label: getSideLabel('Север', sec.length),
        floors: sec.floors,
        height: h
      });

      // 4. West Wall (x = x1)
      faces.push({
        points: [{ x: x1, y: 0, z: z1 }, { x: x1, y: 0, z: z2 }, { x: x1, y: h, z: z2 }, { x: x1, y: h, z: z1 }],
        color: wallColor,
        normal: { x: -1, y: 0, z: 0 },
        label: getSideLabel('Запад', sec.width),
        floors: sec.floors,
        height: h
      });

      // 5. East Wall (x = x2)
      faces.push({
        points: [{ x: x2, y: 0, z: z2 }, { x: x2, y: 0, z: z1 }, { x: x2, y: h, z: z1 }, { x: x2, y: h, z: z2 }],
        color: wallColor,
        normal: { x: 1, y: 0, z: 0 },
        label: getSideLabel('Восток', sec.width),
        floors: sec.floors,
        height: h
      });

      // 6. Roof Geometry
      if (sec.roof_type.toLowerCase() === 'двускатная') {
        const ridgeY = h + 1.8; // roof ridge height
        const midZ = (z1 + z2) / 2;
        // South slope
        faces.push({
          points: [{ x: x1, y: h, z: z2 }, { x: x2, y: h, z: z2 }, { x: x2, y: ridgeY, z: midZ }, { x: x1, y: ridgeY, z: midZ }],
          color: roofColor,
          normal: { x: 0, y: 0.7, z: 0.7 },
          isRoof: true
        });
        // North slope
        faces.push({
          points: [{ x: x2, y: h, z: z1 }, { x: x1, y: h, z: z1 }, { x: x1, y: ridgeY, z: midZ }, { x: x2, y: ridgeY, z: midZ }],
          color: roofColor,
          normal: { x: 0, y: 0.7, z: -0.7 },
          isRoof: true
        });
        // West gable
        faces.push({
          points: [{ x: x1, y: h, z: z1 }, { x: x1, y: h, z: z2 }, { x: x1, y: ridgeY, z: midZ }],
          color: wallColor,
          normal: { x: -1, y: 0, z: 0 }
        });
        // East gable
        faces.push({
          points: [{ x: x2, y: h, z: z2 }, { x: x2, y: h, z: z1 }, { x: x2, y: ridgeY, z: midZ }],
          color: wallColor,
          normal: { x: 1, y: 0, z: 0 }
        });
      } else if (sec.roof_type.toLowerCase() === 'четырехскатная' || sec.roof_type.toLowerCase() === 'мансардная') {
        const ridgeY = h + 2.0;
        const midX1 = x1 + sec.length * 0.25;
        const midX2 = x2 - sec.length * 0.25;
        const midZ = (z1 + z2) / 2;
        // South slope
        faces.push({
          points: [{ x: x1, y: h, z: z2 }, { x: x2, y: h, z: z2 }, { x: midX2, y: ridgeY, z: midZ }, { x: midX1, y: ridgeY, z: midZ }],
          color: roofColor,
          normal: { x: 0, y: 0.7, z: 0.7 },
          isRoof: true
        });
        // North slope
        faces.push({
          points: [{ x: x2, y: h, z: z1 }, { x: x1, y: h, z: z1 }, { x: midX1, y: ridgeY, z: midZ }, { x: midX2, y: ridgeY, z: midZ }],
          color: roofColor,
          normal: { x: 0, y: 0.7, z: -0.7 },
          isRoof: true
        });
        // West slope
        faces.push({
          points: [{ x: x1, y: h, z: z1 }, { x: x1, y: h, z: z2 }, { x: midX1, y: ridgeY, z: midZ }],
          color: roofColor,
          normal: { x: -0.7, y: 0.7, z: 0 },
          isRoof: true
        });
        // East slope
        faces.push({
          points: [{ x: x2, y: h, z: z2 }, { x: x2, y: h, z: z1 }, { x: midX2, y: ridgeY, z: midZ }],
          color: roofColor,
          normal: { x: 0.7, y: 0.7, z: 0 },
          isRoof: true
        });
      } else {
        // Flat roof
        faces.push({
          points: [{ x: x1, y: h, z: z2 }, { x: x2, y: h, z: z2 }, { x: x2, y: h, z: z1 }, { x: x1, y: h, z: z1 }],
          color: roofColor,
          normal: { x: 0, y: 1, z: 0 },
          isRoof: true
        });
      }
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

      // Draw Labels on visible walls
      if (face.label && displayMode !== 'top') {
        // Check if face is pointing towards camera
        // Camera vector in world coords is roughly based on yaw/pitch
        const camX = Math.sin(yaw);
        const camZ = -Math.cos(yaw);
        const dotCam = face.normal.x * camX + face.normal.z * camZ;

        // If dotCam < 0, wall is facing the camera
        if (dotCam < -0.1) {
          // Calculate center of the top edge of the wall
          const midX = (face.points[2].x + face.points[3].x) / 2;
          const midY = (face.points[2].y + face.points[3].y) / 2;
          const midZ = (face.points[2].z + face.points[3].z) / 2;
          const labelPos = project(midX, midY, midZ);

          ctx.fillStyle = '#2ed38a';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(face.label, labelPos.x, labelPos.y - 8);
        }
      }

      // In top view, draw section name in center
      if (displayMode === 'top' && face.sectionName) {
        const midX = (face.points[0].x + face.points[2].x) / 2;
        const midZ = (face.points[0].z + face.points[2].z) / 2;
        const labelPos = project(midX, 0, midZ);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(face.sectionName, labelPos.x, labelPos.y);
      }
    });

  }, [sections, displayMode, yaw, pitch, zoom]);

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
