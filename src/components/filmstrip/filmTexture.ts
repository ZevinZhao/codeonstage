// ============================================================
// 胶卷拼图纹理（Canvas 程序化生成）
// ------------------------------------------------------------
// 一整条 35mm 胶卷（胶片底色、上下齿孔、帧间分隔、画面格）
// 绘制到一张宽 Canvas 上：12 个帧格横向拼接。
// Three.js 侧以 wrapS = RepeatWrapping 采样，滚动 = UV 取模偏移，
// 从而实现画面/齿孔/边框作为一个整体连续无缝移动。
// ============================================================
import type { ShowcaseItem } from '@/data/showcase';
import { drawDemoCover } from './demoCover';

// ------------------------------------------------------------
// 帧格排版常量（比例固定，分辨率由 cellWidth 自适应）
// ------------------------------------------------------------

/** 帧格宽高比（cellH / cellW），35mm 胶片观感：画面区 16:9 居中，上下留齿孔带 */
const CELL_ASPECT = 0.75;

/** 画面区左右留白（占 cell 宽比例，形成帧间间隔） */
const FRAME_PAD_X = 0.03;

/** 每个 cell 每侧齿孔数量（35mm 胶片每帧 4 孔） */
const SPROCKETS_PER_CELL = 4;

/** 胶片本体底色（任务参考值：#2a2a2a 底） */
const FILM_BASE = '#2a2a2a';

/** 齿孔颜色（透出底片的暗孔） */
const SPROCKET_HOLE = '#1c1c1c';

/** 齿孔上缘高光（极细） */
const SPROCKET_HIGHLIGHT = 'rgba(255, 255, 255, 0.08)';

/** 画面区底色（比胶片底更暗的「银幕」底，供 letterbox 留黑） */
const SCREEN_BASE = '#101014';

/** 帧间分隔线颜色 */
const FRAME_DIVIDER = '#1d1d1d';

/** 帧格排版信息（像素，供绘制与外部对齐） */
export interface FilmLayout {
  /** 帧格宽（px） */
  cellW: number;
  /** 帧格高（px） */
  cellH: number;
  /** 画面区宽（px，16:9） */
  frameW: number;
  /** 画面区高（px） */
  frameH: number;
  /** 画面区在 cell 内的 X 偏移（px） */
  frameX: number;
  /** 画面区在 cell 内的 Y 偏移（px） */
  frameY: number;
  /** 上下齿孔带高（px） */
  edgeH: number;
}

// ------------------------------------------------------------
// 绘制原语
// ------------------------------------------------------------

/** 计算帧格排版（画面区 16:9 + 上下齿孔带） */
export function computeLayout(cellW: number): FilmLayout {
  const cellH = Math.round(cellW * CELL_ASPECT);
  const frameW = Math.round(cellW * (1 - FRAME_PAD_X * 2));
  const frameH = Math.round((frameW * 9) / 16);
  const edgeH = Math.max(18, Math.round((cellH - frameH) / 2));
  // 若上下带挤压到最小值，重算画面高（保持 cell 总高不变）
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

/** 绘制一整个帧格的「底」（胶片底 + 齿孔 + 分隔线 + 画面暗底） */
function drawCellBase(
  ctx: CanvasRenderingContext2D,
  layout: FilmLayout,
  cellOriginX: number
): void {
  const { cellW, cellH, frameW, frameH, frameX, frameY, edgeH } = layout;

  // 胶片本体
  ctx.fillStyle = FILM_BASE;
  ctx.fillRect(cellOriginX, 0, cellW, cellH);

  // 画面区暗底（letterbox 底）
  ctx.fillStyle = SCREEN_BASE;
  ctx.fillRect(cellOriginX + frameX, frameY, frameW, frameH);

  // 画面区四周极细内描边（「画框」质感，克制的一根线）
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = Math.max(1, Math.round(cellW / 512));
  ctx.strokeRect(
    cellOriginX + frameX + 0.5,
    frameY + 0.5,
    frameW - 1,
    frameH - 1
  );

  // 上下两排齿孔
  const holeW = Math.max(8, Math.round(cellW / 5.8));
  const holeH = Math.max(5, Math.round(Math.min(edgeH * 0.42, holeW * 0.6)));
  const holeR = holeH / 3;
  // 齿孔水平分布占画面区宽度，均匀间隔
  const span = frameW;
  const gap = span / SPROCKETS_PER_CELL;
  const holeYOffsets = [
    Math.round(edgeH / 2 - holeH / 2), // 上排
    cellH - edgeH + Math.round(edgeH / 2 - holeH / 2), // 下排
  ];
  for (let side = 0; side < 2; side++) {
    const hy = holeYOffsets[side];
    for (let i = 0; i < SPROCKETS_PER_CELL; i++) {
      const hx = Math.round(
        cellOriginX + frameX + gap * i + (gap - holeW) / 2
      );
      // 孔体（圆角矩形，暗孔）
      ctx.fillStyle = SPROCKET_HOLE;
      ctx.beginPath();
      roundRect(ctx, hx, hy, holeW, holeH, holeR);
      ctx.fill();
      // 上缘极细高光（模拟金属齿孔的受光边）
      ctx.fillStyle = SPROCKET_HIGHLIGHT;
      ctx.fillRect(hx + holeR, hy, holeW - holeR * 2, Math.max(1, Math.round(cellW / 384)));
    }
  }

  // 帧间分隔线（cell 右边界）
  ctx.fillStyle = FRAME_DIVIDER;
  ctx.fillRect(
    cellOriginX + cellW - Math.max(2, Math.round(cellW / 256)),
    0,
    Math.max(2, Math.round(cellW / 256)),
    cellH
  );
}

/** 兼容旧浏览器的圆角矩形路径（不依赖 ctx.roundRect） */
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

/** 在画面区内 contain 模式绘制图片（不裁切、不拉伸，短边留 letterbox 黑） */
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

// ------------------------------------------------------------
// 拼图 Canvas 构建
// ------------------------------------------------------------

/**
 * 同步构建整条胶卷的拼图 Canvas：
 * 12 个帧格横向拼接，包含底纹/齿孔/分隔线；
 * 无真实封面的条目直接画程序化演示封面，
 * 有真实封面的条目先画深色占位（等图片加载后重绘）。
 *
 * 注意：Canvas 总宽 = items.length × cellW，调用方需确保
 * 不超过 WebGL maxTextureSize（由 cellWidth 自适应保证）。
 */
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
    // 理论上不可达（2D context 普遍可用）；返回空白画布兜底
    return { canvas, layout };
  }

  items.forEach((item, i) => {
    const cellX = i * cellW;
    drawCellBase(ctx, layout, cellX);
    if (!item.coverUrl) {
      // 程序化演示封面（seed 用条目序号，保证确定性）
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

/** 加载单条封面图（crossOrigin 匿名，raw.githubusercontent.com 支持 CORS） */
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

/**
 * 异步加载全部真实封面，并把加载成功的画面重绘进对应帧格。
 * 失败的条目回退为程序化演示封面，保证任何网络状态下胶卷完整。
 *
 * @returns 是否至少重绘了一格（调用方据此触发 texture.needsUpdate）
 */
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
      // 加载失败 → 演示封面兜底（seed 与初始绘制保持一致）
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