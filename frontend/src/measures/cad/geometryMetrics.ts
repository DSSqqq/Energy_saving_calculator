import type { BuildingSectionItem } from './BuildingCadViewer';
import { buildSectionFootprint } from './footprint';

export interface SectionMetrics {
  sectionId: number;
  sectionName: string;
  footprintArea: number;
  height: number;
  volume: number;
  exteriorWallArea: number;
  junctionWallArea: number;
}

export interface BuildingGeometryMetrics {
  sections: SectionMetrics[];
  totalFootprintArea: number;
  totalExteriorWallArea: number;
  totalJunctionWallArea: number;
  totalVolume: number;
}

interface WallEdgeRef {
  sectionId: number;
  edgeIndex: number;
  length: number;
  height: number;
  start: { x: number; z: number };
  end: { x: number; z: number };
}

function polygonArea(vertices: { x: number; z: number }[]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    sum += vertices[i].x * vertices[j].z - vertices[j].x * vertices[i].z;
  }
  return Math.abs(sum) / 2;
}

function edgeKey(a: { x: number; z: number }, b: { x: number; z: number }, eps = 0.05): string {
  const norm = (p: { x: number; z: number }) => ({
    x: Math.round(p.x / eps) * eps,
    z: Math.round(p.z / eps) * eps,
  });
  const p1 = norm(a);
  const p2 = norm(b);
  const k1 = `${p1.x},${p1.z}`;
  const k2 = `${p2.x},${p2.z}`;
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

function overlapLength(
  a0: { x: number; z: number },
  a1: { x: number; z: number },
  b0: { x: number; z: number },
  b1: { x: number; z: number },
  eps = 0.05,
): number {
  if (edgeKey(a0, a1, eps) !== edgeKey(b0, b1, eps)) return 0;

  const dx = Math.abs(a1.x - a0.x);
  const dz = Math.abs(a1.z - a0.z);
  if (dx >= dz) {
    const minA = Math.min(a0.x, a1.x);
    const maxA = Math.max(a0.x, a1.x);
    const minB = Math.min(b0.x, b1.x);
    const maxB = Math.max(b0.x, b1.x);
    return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
  }
  const minA = Math.min(a0.z, a1.z);
  const maxA = Math.max(a0.z, a1.z);
  const minB = Math.min(b0.z, b1.z);
  const maxB = Math.max(b0.z, b1.z);
  return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
}

function junctionHeight(h1: number, h2: number): number {
  return Math.min(h1, h2);
}

export function computeBuildingGeometryMetrics(sections: BuildingSectionItem[]): BuildingGeometryMetrics {
  if (sections.length === 0) {
    return {
      sections: [],
      totalFootprintArea: 0,
      totalExteriorWallArea: 0,
      totalJunctionWallArea: 0,
      totalVolume: 0,
    };
  }

  const footprints = sections.map(buildSectionFootprint);
  const allEdges: WallEdgeRef[] = sections.flatMap((sec, idx) => {
    const fp = footprints[idx];
    const height = sec.height_outer;
    return fp.edges.map((edge, edgeIndex) => ({
      sectionId: sec.id,
      edgeIndex,
      length: edge.length,
      height,
      start: fp.vertices[edge.v0],
      end: fp.vertices[edge.v1],
    }));
  });

  const sectionMetrics: SectionMetrics[] = sections.map((sec, idx) => {
    const fp = footprints[idx];
    const footprintArea = polygonArea(fp.vertices);
    const height = sec.height_outer;
    const edges = allEdges.filter(e => e.sectionId === sec.id);

    let exteriorWallArea = 0;
    let junctionWallArea = 0;

    edges.forEach(edge => {
      const sharedWith = allEdges.filter(other => {
        if (other.sectionId === edge.sectionId) return false;
        return overlapLength(edge.start, edge.end, other.start, other.end) > 0.05;
      });

      if (sharedWith.length === 0) {
        exteriorWallArea += edge.length * edge.height;
        return;
      }

      const totalSharedLen = sharedWith.reduce(
        (sum, other) => sum + overlapLength(edge.start, edge.end, other.start, other.end),
        0,
      );

      sharedWith.forEach(other => {
        const sharedLen = overlapLength(edge.start, edge.end, other.start, other.end);
        junctionWallArea += sharedLen * junctionHeight(edge.height, other.height);
      });

      const exteriorLen = Math.max(0, edge.length - totalSharedLen);
      exteriorWallArea += exteriorLen * edge.height;
    });

    return {
      sectionId: sec.id,
      sectionName: sec.name,
      footprintArea,
      height,
      volume: footprintArea * height,
      exteriorWallArea,
      junctionWallArea,
    };
  });

  const totalJunctionWallArea = sectionMetrics.reduce((s, m) => s + m.junctionWallArea, 0) / 2;
  const totalExteriorWallArea = sectionMetrics.reduce((s, m) => s + m.exteriorWallArea, 0);
  const totalFootprintArea = sectionMetrics.reduce((s, m) => s + m.footprintArea, 0);
  const totalVolume = sectionMetrics.reduce((s, m) => s + m.volume, 0);

  return {
    sections: sectionMetrics.map(m => ({
      ...m,
      junctionWallArea: sections.length > 1 ? m.junctionWallArea / 2 : m.junctionWallArea,
    })),
    totalFootprintArea,
    totalExteriorWallArea,
    totalJunctionWallArea,
    totalVolume,
  };
}

export function formatMetric(value: number, digits = 2): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
