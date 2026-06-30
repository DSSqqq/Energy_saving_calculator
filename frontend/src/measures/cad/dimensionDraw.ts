import type { SectionFootprint } from './footprint';

export interface RoofDimension {
  cornerAx: number;
  cornerAz: number;
  cornerBx: number;
  cornerBz: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  y: number;
  length: number;
  text: string;
}

type ProjectFn = (x: number, y: number, z: number) => { x: number; y: number; zDepth: number };

function towardCenter(
  v0: { x: number; z: number },
  v1: { x: number; z: number },
  vertices: { x: number; z: number }[],
) {
  const midX = (v0.x + v1.x) / 2;
  const midZ = (v0.z + v1.z) / 2;
  let cx = 0;
  let cz = 0;
  vertices.forEach(v => {
    cx += v.x;
    cz += v.z;
  });
  cx /= vertices.length;
  cz /= vertices.length;
  const dx = cx - midX;
  const dz = cz - midZ;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

export function buildRoofDimensions(
  footprint: SectionFootprint,
  roofY: number,
  insetMeters = 0.45,
): RoofDimension[] {
  const verts = footprint.vertices;

  return footprint.edges.map(edge => {
    const v0 = verts[edge.v0];
    const v1 = verts[edge.v1];
    const inn = towardCenter(v0, v1, verts);
    const len = edge.length;

    const ax = v0.x + inn.x * insetMeters;
    const az = v0.z + inn.z * insetMeters;
    const bx = v1.x + inn.x * insetMeters;
    const bz = v1.z + inn.z * insetMeters;

    const orient = edge.orientation.split(/[\s(]/)[0];
    const text = `${len % 1 === 0 ? len : len.toFixed(1)} м`;

    return {
      cornerAx: v0.x,
      cornerAz: v0.z,
      cornerBx: v1.x,
      cornerBz: v1.z,
      ax,
      az,
      bx,
      bz,
      y: roofY + 0.03,
      length: len,
      text: `${orient} · ${text}`,
    };
  });
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  angle: number,
  size: number,
) {
  const spread = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - size * Math.cos(angle - spread),
    tipY - size * Math.sin(angle - spread),
  );
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - size * Math.cos(angle + spread),
    tipY - size * Math.sin(angle + spread),
  );
  ctx.stroke();
}

export function drawRoofDimension(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  dim: RoofDimension,
  zoom: number,
) {
  const y = dim.y;

  const pA = project(dim.ax, y, dim.az);
  const pB = project(dim.bx, y, dim.bz);

  const dx = pB.x - pA.x;
  const dy = pB.y - pA.y;
  const screenLen = Math.hypot(dx, dy);
  if (screenLen < 18) return;

  const angle = Math.atan2(dy, dx);
  const arrowSize = Math.max(5, Math.min(11, zoom * 0.22));

  ctx.save();
  ctx.strokeStyle = '#2ed38a';
  ctx.fillStyle = '#eafff5';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';

  // Основная размерная линия
  ctx.beginPath();
  ctx.moveTo(pA.x, pA.y);
  ctx.lineTo(pB.x, pB.y);
  ctx.stroke();

  // Стрелки (внутрь, друг к другу — как на чертеже)
  drawArrowhead(ctx, pA.x, pA.y, angle, arrowSize);
  drawArrowhead(ctx, pB.x, pB.y, angle + Math.PI, arrowSize);

  // Текст по центру линии
  const midX = (pA.x + pB.x) / 2;
  const midY = (pA.y + pB.y) / 2;
  const label = dim.text;

  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let textAngle = angle;
  if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
    textAngle += Math.PI;
  }

  ctx.translate(midX, midY);
  ctx.rotate(textAngle);

  const metrics = ctx.measureText(label);
  const padX = 5;
  const padY = 3;
  const boxW = metrics.width + padX * 2;
  const boxH = 14 + padY;

  ctx.fillStyle = 'rgba(8, 18, 14, 0.82)';
  ctx.strokeStyle = 'rgba(46, 211, 138, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2ed38a';
  ctx.fillText(label, 0, 0);

  ctx.restore();
}

export function drawRoofDimensionWithWitness(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  dim: RoofDimension,
  zoom: number,
) {
  const y = dim.y;

  const wA0 = project(dim.cornerAx, y - 0.01, dim.cornerAz);
  const wA1 = project(dim.ax, y, dim.az);
  const wB0 = project(dim.cornerBx, y - 0.01, dim.cornerBz);
  const wB1 = project(dim.bx, y, dim.bz);

  ctx.save();
  ctx.strokeStyle = 'rgba(46, 211, 138, 0.45)';
  ctx.lineWidth = 0.75;
  ctx.setLineDash([2, 2]);

  ctx.beginPath();
  ctx.moveTo(wA0.x, wA0.y);
  ctx.lineTo(wA1.x, wA1.y);
  ctx.moveTo(wB0.x, wB0.y);
  ctx.lineTo(wB1.x, wB1.y);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();

  drawRoofDimension(ctx, project, dim, zoom);
}
