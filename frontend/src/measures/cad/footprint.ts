import type { BuildingSectionItem, SectionSide } from './BuildingCadViewer';

export interface FootprintVertex {
  x: number;
  z: number;
}

export interface FootprintEdge {
  orientation: string;
  length: number;
  label: string;
  v0: number;
  v1: number;
}

export interface SectionFootprint {
  vertices: FootprintVertex[];
  edges: FootprintEdge[];
}

function sideLength(sides: SectionSide[] | undefined, prefix: string): number | null {
  const side = sides?.find(s => s.orientation.toLowerCase().startsWith(prefix));
  if (!side || side.length <= 0) return null;
  const n = typeof side.length === 'number' ? side.length : parseFloat(String(side.length));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sideMeta(sides: SectionSide[] | undefined, prefix: string) {
  const side = sides?.find(s => s.orientation.toLowerCase().startsWith(prefix));
  if (!side) return null;
  const length = sideLength(sides, prefix);
  if (length === null) return null;
  return {
    orientation: side.orientation,
    length,
    label: `${side.orientation}: ${length}м (${side.name})`,
  };
}

/** Четырёхугольник по сторонам С/Ю/В/З — трапеция, если длины разные */
function buildCardinalQuadFootprint(
  sec: BuildingSectionItem,
  south: number,
  north: number,
  east: number,
  west: number,
): SectionFootprint {
  const ox = sec.offset_x;
  const oz = sec.offset_y;
  const dx = Math.abs(south - north);
  const depthWest = Math.sqrt(Math.max(west * west - dx * dx, 0.25));
  const depthEast = east;

  const vertices: FootprintVertex[] = [
    { x: ox, z: oz },
    { x: ox + south, z: oz },
    { x: ox + south, z: oz - depthEast },
    { x: ox + south - north, z: oz - depthWest },
  ];

  const meta = {
    south: sideMeta(sec.sides, 'ю'),
    east: sideMeta(sec.sides, 'в'),
    north: sideMeta(sec.sides, 'с'),
    west: sideMeta(sec.sides, 'з'),
  };

  const edges: FootprintEdge[] = [
    {
      orientation: meta.south?.orientation ?? 'Юг',
      length: south,
      label: meta.south?.label ?? `Юг: ${south}м`,
      v0: 0,
      v1: 1,
    },
    {
      orientation: meta.east?.orientation ?? 'Восток',
      length: east,
      label: meta.east?.label ?? `Восток: ${east}м`,
      v0: 1,
      v1: 2,
    },
    {
      orientation: meta.north?.orientation ?? 'Север',
      length: north,
      label: meta.north?.label ?? `Север: ${north}м`,
      v0: 2,
      v1: 3,
    },
    {
      orientation: meta.west?.orientation ?? 'Запад',
      length: west,
      label: meta.west?.label ?? `Запад: ${west}м`,
      v0: 3,
      v1: 0,
    },
  ];

  return { vertices, edges };
}

/** Обход произвольного периметра: поворот на 90° по часовой стрелке */
function buildSequentialFootprint(sec: BuildingSectionItem): SectionFootprint | null {
  const sides = sec.sides?.filter(s => s.length > 0);
  if (!sides || sides.length < 3) return null;

  const ox = sec.offset_x;
  const oz = sec.offset_y;
  const vertices: FootprintVertex[] = [{ x: ox, z: oz }];

  // +X юг, -Z север (вид сверху)
  const dirVectors = [
    { x: 1, z: 0 },
    { x: 0, z: -1 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
  ];

  const dirForOrientation = (orientation: string) => {
    const o = orientation.toLowerCase();
    if (o.startsWith('ю')) return dirVectors[0];
    if (o.startsWith('в')) return dirVectors[1];
    if (o.startsWith('с')) return dirVectors[2];
    if (o.startsWith('з')) return dirVectors[3];
    return null;
  };

  let dirIdx = 0;
  const edges: FootprintEdge[] = [];

  for (let i = 0; i < sides.length; i++) {
    const side = sides[i];
    const len = typeof side.length === 'number' ? side.length : parseFloat(String(side.length));
    if (!Number.isFinite(len) || len <= 0) continue;

    const orientDir = dirForOrientation(side.orientation);
    let dx = 0;
    let dz = 0;
    if (orientDir) {
      dx = orientDir.x * len;
      dz = orientDir.z * len;
    } else {
      const dir = dirVectors[dirIdx % 4];
      dx = dir.x * len;
      dz = dir.z * len;
      dirIdx += 1;
    }

    const prev = vertices[vertices.length - 1];
    const next = { x: prev.x + dx, z: prev.z + dz };
    vertices.push(next);
    edges.push({
      orientation: side.orientation,
      length: len,
      label: `${side.orientation}: ${len}м (${side.name})`,
      v0: vertices.length - 2,
      v1: vertices.length - 1,
    });
    dirIdx += 1;
  }

  if (vertices.length < 4) return null;
  return { vertices, edges };
}

function buildRectangleFootprint(sec: BuildingSectionItem): SectionFootprint {
  const ox = sec.offset_x;
  const oz = sec.offset_y;
  const l = sec.length;
  const w = sec.width;

  const vertices: FootprintVertex[] = [
    { x: ox, z: oz },
    { x: ox + l, z: oz },
    { x: ox + l, z: oz - w },
    { x: ox, z: oz - w },
  ];

  const edges: FootprintEdge[] = [
    { orientation: 'Юг', length: l, label: `Юг: ${l}м`, v0: 0, v1: 1 },
    { orientation: 'Восток', length: w, label: `Восток: ${w}м`, v0: 1, v1: 2 },
    { orientation: 'Север', length: l, label: `Север: ${l}м`, v0: 2, v1: 3 },
    { orientation: 'Запад', length: w, label: `Запад: ${w}м`, v0: 3, v1: 0 },
  ];

  return { vertices, edges };
}

export function buildSectionFootprint(sec: BuildingSectionItem): SectionFootprint {
  const south = sideLength(sec.sides, 'ю');
  const north = sideLength(sec.sides, 'с');
  const east = sideLength(sec.sides, 'в');
  const west = sideLength(sec.sides, 'з');

  const hasAllCardinal = south !== null && north !== null && east !== null && west !== null;
  if (hasAllCardinal) {
    return buildCardinalQuadFootprint(sec, south, north, east, west);
  }

  const sequential = buildSequentialFootprint(sec);
  if (sequential) return sequential;

  if (south !== null || north !== null || east !== null || west !== null) {
    return buildCardinalQuadFootprint(
      sec,
      south ?? sec.length,
      north ?? sec.length,
      east ?? sec.width,
      west ?? sec.width,
    );
  }

  return buildRectangleFootprint(sec);
}

export function getFootprintBounds(footprints: SectionFootprint[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  footprints.forEach(fp => {
    fp.vertices.forEach(v => {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    });
  });

  return { minX, maxX, minZ, maxZ };
}

export function footprintGeometryKey(sec: BuildingSectionItem): string {
  const sidesKey = (sec.sides ?? [])
    .map(s => `${s.orientation}:${s.length}`)
    .join(',');
  return `${sec.id}|${sec.height_outer}|${sec.offset_x}|${sec.offset_y}|${sec.roof_type}|${sidesKey}|${sec.length}x${sec.width}`;
}

export interface FootprintEdgeSegment {
  orientation: string;
  length: number;
  start: FootprintVertex;
  end: FootprintVertex;
}

export type JoinAlignment = 'start' | 'center' | 'end';

function edgeDirection(edge: FootprintEdgeSegment): { x: number; z: number; len: number } {
  const dx = edge.end.x - edge.start.x;
  const dz = edge.end.z - edge.start.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return { x: 0, z: 0, len: 0 };
  return { x: dx / len, z: dz / len, len };
}

function translateFootprint(fp: SectionFootprint, dx: number, dz: number): SectionFootprint {
  return {
    vertices: fp.vertices.map(v => ({ x: v.x + dx, z: v.z + dz })),
    edges: fp.edges,
  };
}

function polygonCentroid(vertices: FootprintVertex[]): FootprintVertex {
  let sx = 0;
  let sz = 0;
  vertices.forEach(v => {
    sx += v.x;
    sz += v.z;
  });
  return { x: sx / vertices.length, z: sz / vertices.length };
}

function outwardNormal(v0: FootprintVertex, v1: FootprintVertex): { x: number; z: number } {
  const ex = v1.x - v0.x;
  const ez = v1.z - v0.z;
  const len = Math.hypot(ex, ez) || 1;
  return { x: ez / len, z: -ex / len };
}

/** Оценка: черновик снаружи целевой секции */
function scoreJoinPlacement(
  draftFp: SectionFootprint,
  targetFp: SectionFootprint,
  offsetX: number,
  offsetZ: number,
  targetEdge: FootprintEdgeSegment,
  attachEdge: FootprintEdgeSegment,
  edgeJoin: boolean,
): number {
  const placed = translateFootprint(draftFp, offsetX, offsetZ);
  const draftCent = polygonCentroid(placed.vertices);
  const targetCent = polygonCentroid(targetFp.vertices);
  const edgeMid = {
    x: (targetEdge.start.x + targetEdge.end.x) / 2,
    z: (targetEdge.start.z + targetEdge.end.z) / 2,
  };
  const normal = outwardNormal(targetEdge.start, targetEdge.end);

  const draftOutward = (draftCent.x - edgeMid.x) * normal.x + (draftCent.z - edgeMid.z) * normal.z;
  const targetInward = (targetCent.x - edgeMid.x) * normal.x + (targetCent.z - edgeMid.z) * normal.z;

  let score = 0;
  if (draftOutward * targetInward < 0) score += 100;

  if (edgeJoin) {
    [attachEdge.start, attachEdge.end].forEach(v => {
      const px = v.x + offsetX;
      const pz = v.z + offsetZ;
      const dx = px - targetEdge.start.x;
      const dz = pz - targetEdge.start.z;
      const tDir = edgeDirection(targetEdge);
      const along = dx * tDir.x + dz * tDir.z;
      const lx = targetEdge.start.x + tDir.x * along;
      const lz = targetEdge.start.z + tDir.z * along;
      const dist = Math.hypot(px - lx, pz - lz);
      score -= dist * 2;
      if (dist < 0.15) score += 30;
    });
  } else {
    score += Math.min(Math.hypot(draftCent.x - targetCent.x, draftCent.z - targetCent.z), 50);
  }

  return score;
}

export function getEdgeByOrientation(
  footprint: SectionFootprint,
  orientationPrefix: string,
): FootprintEdgeSegment | null {
  const prefix = orientationPrefix.toLowerCase();
  const edge = footprint.edges.find(e => e.orientation.toLowerCase().startsWith(prefix));
  if (!edge) return null;
  return {
    orientation: edge.orientation,
    length: edge.length,
    start: footprint.vertices[edge.v0],
    end: footprint.vertices[edge.v1],
  };
}

export function getOppositeOrientation(orientation: string): string {
  const o = orientation.toLowerCase();
  if (o.startsWith('с')) return 'Юг';
  if (o.startsWith('ю')) return 'Север';
  if (o.startsWith('в')) return 'Запад';
  if (o.startsWith('з')) return 'Восток';
  return 'Запад';
}

function sidePrefix(orientation: string): 'n' | 's' | 'e' | 'w' | null {
  const o = orientation.toLowerCase();
  if (o.startsWith('с')) return 'n';
  if (o.startsWith('ю')) return 's';
  if (o.startsWith('в')) return 'e';
  if (o.startsWith('з')) return 'w';
  return null;
}

export function isOppositeSide(a: string, b: string): boolean {
  const pa = sidePrefix(a);
  const pb = sidePrefix(b);
  if (!pa || !pb) return false;
  return (
    (pa === 'n' && pb === 's') ||
    (pa === 's' && pb === 'n') ||
    (pa === 'e' && pb === 'w') ||
    (pa === 'w' && pb === 'e')
  );
}

function isPerpendicularSide(a: string, b: string): boolean {
  const pa = sidePrefix(a);
  const pb = sidePrefix(b);
  if (!pa || !pb || pa === pb) return false;
  return !isOppositeSide(a, b);
}

/** Параллельные стены: совмещение ребро к ребру */
function computeParallelEdgeJoin(
  attachEdge: FootprintEdgeSegment,
  targetEdge: FootprintEdgeSegment,
  alignment: JoinAlignment,
  slideMeters: number,
): { offset_x: number; offset_y: number }[] {
  const tDir = edgeDirection(targetEdge);
  const aDir = edgeDirection(attachEdge);
  if (tDir.len < 1e-6 || aDir.len < 1e-6) return [];

  const attachLen = aDir.len;

  let sStart = 0;
  if (alignment === 'center') sStart = (tDir.len - attachLen) / 2;
  else if (alignment === 'end') sStart = tDir.len - attachLen;
  sStart += slideMeters;
  sStart = Math.max(0, Math.min(sStart, Math.max(0, tDir.len - attachLen)));

  const targetSegStart = {
    x: targetEdge.start.x + tDir.x * sStart,
    z: targetEdge.start.z + tDir.z * sStart,
  };

  const alignedWithTarget = tDir.x * aDir.x + tDir.z * aDir.z > 0;
  const ref = alignedWithTarget ? attachEdge.start : attachEdge.end;

  return [{
    offset_x: targetSegStart.x - ref.x,
    offset_y: targetSegStart.z - ref.z,
  }];
}

/** Перпендикулярные стены: стыковка угла к углу (L-образная форма) */
function computeCornerJoinCandidates(
  attachEdge: FootprintEdgeSegment,
  targetEdge: FootprintEdgeSegment,
): { offset_x: number; offset_y: number }[] {
  const pairs = [
    { ax: attachEdge.start.x, az: attachEdge.start.z, tx: targetEdge.start.x, tz: targetEdge.start.z },
    { ax: attachEdge.start.x, az: attachEdge.start.z, tx: targetEdge.end.x, tz: targetEdge.end.z },
    { ax: attachEdge.end.x, az: attachEdge.end.z, tx: targetEdge.start.x, tz: targetEdge.start.z },
    { ax: attachEdge.end.x, az: attachEdge.end.z, tx: targetEdge.end.x, tz: targetEdge.end.z },
  ];

  return pairs.map(p => ({
    offset_x: p.tx - p.ax,
    offset_y: p.tz - p.az,
  }));
}

function areEdgesParallel(
  attachEdge: FootprintEdgeSegment,
  targetEdge: FootprintEdgeSegment,
  eps = 0.08,
): boolean {
  const t = edgeDirection(targetEdge);
  const a = edgeDirection(attachEdge);
  if (t.len < 1e-6 || a.len < 1e-6) return false;
  const cross = Math.abs(t.x * a.z - t.z * a.x);
  return cross <= eps;
}

/** Смещение черновика секции, чтобы сторона attachSide пристыковалась к targetSide */
export function computeJoinOffset(
  draft: BuildingSectionItem,
  target: BuildingSectionItem,
  targetSide: string,
  attachSide: string,
  alignment: JoinAlignment = 'center',
  slideMeters = 0,
): { offset_x: number; offset_y: number } | null {
  const draftFp = buildSectionFootprint({ ...draft, offset_x: 0, offset_y: 0 });
  const targetFp = buildSectionFootprint(target);

  const targetEdge = getEdgeByOrientation(targetFp, targetSide);
  const rawAttachEdge = getEdgeByOrientation(draftFp, attachSide);
  if (!targetEdge || !rawAttachEdge) return null;

  const opposite = isOppositeSide(targetSide, attachSide);
  const perpendicular = isPerpendicularSide(targetSide, attachSide);
  const useEdgeJoin = opposite || (areEdgesParallel(rawAttachEdge, targetEdge) && !perpendicular);

  const candidates = useEdgeJoin
    ? computeParallelEdgeJoin(rawAttachEdge, targetEdge, alignment, slideMeters)
    : computeCornerJoinCandidates(rawAttachEdge, targetEdge);

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = -Infinity;

  candidates.forEach(c => {
    const score = scoreJoinPlacement(
      draftFp,
      targetFp,
      c.offset_x,
      c.offset_y,
      targetEdge,
      rawAttachEdge,
      useEdgeJoin,
    );
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  });

  return best;
}

export function listJoinSideOptions(sec: BuildingSectionItem): { value: string; label: string }[] {
  if (sec.sides && sec.sides.length > 0) {
    return sec.sides.map(s => ({
      value: s.orientation,
      label: `${s.orientation} (${s.length} м${s.name ? ` — ${s.name}` : ''})`,
    }));
  }
  return [
    { value: 'Юг', label: 'Юг' },
    { value: 'Восток', label: 'Восток' },
    { value: 'Север', label: 'Север' },
    { value: 'Запад', label: 'Запад' },
  ];
}
