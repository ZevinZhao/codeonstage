import type { ShowcaseItem } from '@/data/showcase';
import { drawDemoCover } from './demoCover';

const CELL_ASPECT = 0.64;

const FRAME_PAD_X = 0.03;

const SPROCKETS_PER_CELL = 6;

const FILM_TOP = '#303438';

const FILM_MIDDLE = '#17191c';

const FILM_BOTTOM = '#2a2d31';

const FRAME_DIVIDER = '#0d0f11';

export interface FilmLayout {
  cellW: number;
  cellH: number;
  frameW: number;
  frameH: number;
  frameX: number;
  frameY: number;
  edgeH: number;
}

export function computeLayout(cellW: number): FilmLayout {
  const cellH = Math.round(cellW * CELL_ASPECT);
  const frameW = Math.round(cellW * (1 - FRAME_PAD_X * 2));
  const frameH = Math.round((frameW * 9) / 16);
  const edgeH = Math.max(18, Math.round((cellH - frameH) / 2));
  const frameHFinal = cellH - edgeH * 2;
  return {
    cellW,
    cellH,
    frameW,
    frameH: frameHFinal,
    frameX: Math.round(cellW * FRAME_PAD_X),
    frameY: edgeH,
    edgeH,
  };
}

function drawCellBase(
  ctx: CanvasRenderingContext2D,
  layout: FilmLayout,
  cellOriginX: number
): void {
  const { cellW, cellH, frameW, frameH, frameX, frameY, edgeH } = layout;

  const filmGradient = ctx.createLinearGradient(0, 0, 0, cellH);
  filmGradient.addColorStop(0, FILM_TOP);
  filmGradient.addColorStop(0.18, '#222529');
  filmGradient.addColorStop(0.5, FILM_MIDDLE);
  filmGradient.addColorStop(0.82, '#202327');
  filmGradient.addColorStop(1, FILM_BOTTOM);
  ctx.fillStyle = filmGradient;
  ctx.fillRect(cellOriginX, 0, cellW, cellH);

  ctx.clearRect(cellOriginX + frameX, frameY, frameW, frameH);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = Math.max(1, Math.round(cellW / 512));
  ctx.strokeRect(
    cellOriginX + frameX + 0.5,
    frameY + 0.5,
    frameW - 1,
    frameH - 1
  );

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.68)';
  ctx.strokeRect(
    cellOriginX + frameX + 2.5,
    frameY + 2.5,
    frameW - 5,
    frameH - 5
  );

  const railLine = Math.max(1, Math.round(cellW / 640));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.fillRect(cellOriginX, frameY - railLine * 2, cellW, railLine);
  ctx.fillRect(cellOriginX, frameY + frameH + railLine, cellW, railLine);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(cellOriginX, frameY - railLine, cellW, railLine);
  ctx.fillRect(cellOriginX, frameY + frameH, cellW, railLine);

  const span = frameW;
  const gap = span / SPROCKETS_PER_CELL;
  const holeW = Math.max(8, Math.round(gap * 0.57));
  const holeH = Math.max(5, Math.round(Math.min(edgeH * 0.34, holeW * 0.42)));
  const holeR = holeH * 0.28;
  const holeYOffsets = [
    Math.round(edgeH / 2 - holeH / 2),
    cellH - edgeH + Math.round(edgeH / 2 - holeH / 2),
  ];
  for (let side = 0; side < 2; side++) {
    const hy = holeYOffsets[side];
    for (let i = 0; i < SPROCKETS_PER_CELL; i++) {
      const hx = Math.round(
        cellOriginX + frameX + gap * i + (gap - holeW) / 2
      );
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      roundRect(ctx, hx, hy, holeW, holeH, holeR);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = Math.max(1, Math.round(cellW / 768));
      ctx.beginPath();
      roundRect(ctx, hx + 0.5, hy + 0.5, holeW - 1, holeH - 1, holeR);
      ctx.stroke();
    }
  }

  ctx.fillStyle = FRAME_DIVIDER;
  ctx.fillRect(
    cellOriginX + cellW - Math.max(2, Math.round(cellW / 256)),
    0,
    Math.max(2, Math.round(cellW / 256)),
    cellH
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillRect(cellOriginX, 0, Math.max(1, Math.round(cellW / 768)), cellH);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): void {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.min(dw / iw, dh / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}

export function createFilmCanvas(items: ShowcaseItem[], cellW: number): {
  canvas: HTMLCanvasElement;
  layout: FilmLayout;
} {
  const layout = computeLayout(cellW);
  const total = items.length;
  const canvas = document.createElement('canvas');
  canvas.width = cellW * total;
  canvas.height = layout.cellH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { canvas, layout };
  }

  items.forEach((item, i) => {
    const cellX = i * cellW;
    drawCellBase(ctx, layout, cellX);
    if (!item.coverUrl) {
      drawDemoCover(ctx, {
        x: cellX + layout.frameX,
        y: layout.frameY,
        w: layout.frameW,
        h: layout.frameH,
        seed: i + 1,
        title: item.title,
      });
    }
  });

  return { canvas, layout };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`封面加载失败: ${url}`));
    img.src = url;
  });
}

export async function fillFrameImages(
  canvas: HTMLCanvasElement,
  layout: FilmLayout,
  items: ShowcaseItem[]
): Promise<boolean> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const tasks = items.map(async (item, i) => {
    if (!item.coverUrl) return null;
    try {
      return { index: i, img: await loadImage(item.coverUrl) };
    } catch {
      return { index: i, img: null };
    }
  });
  const results = await Promise.all(tasks);

  let touched = false;
  results.forEach((result) => {
    if (!result) return;
    const { index, img } = result;
    const cellX = index * layout.cellW;
    if (img) {
      drawImageContain(
        ctx,
        img,
        cellX + layout.frameX,
        layout.frameY,
        layout.frameW,
        layout.frameH
      );
    } else {
      drawDemoCover(ctx, {
        x: cellX + layout.frameX,
        y: layout.frameY,
        w: layout.frameW,
        h: layout.frameH,
        seed: index + 1,
        title: items[index].title,
      });
    }
    touched = true;
  });
  return touched;
}
