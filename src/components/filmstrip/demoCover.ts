// ============================================================
// 程序化「演示封面」绘制
// - 用于 coverUrl 为空（或加载失败）的精选作品
// - 视觉基调：深色底 + 细几何图形 + 「演示封面」小字标注，克制不花哨
// ============================================================

/** 几何母题种类数（按条目索引取模挑选，让每格演示封面有差异） */
const MOTIF_COUNT = 5;

/** 绘制选项 */
export interface DemoCoverOptions {
  /** 画布上下上目标区域左上角 X（像素） */
  x: number;
  /** 目标区域左上角 Y（像素） */
  y: number;
  /** 目标区域宽（像素） */
  w: number;
  /** 目标区域高（像素） */
  h: number;
  /** 条目序号（决定几何母题与随机种子的确定性变化） */
  seed: number;
  /** 封面上的作品标题（淡灰衬线大字，增强质感） */
  title: string;
}

/**
 * 在指定区域绘制一张演示封面（不裁切、不拉伸，直接铺满目标区域）。
 * 所有绘制均为确定性（由 seed 驱动），同一 seed 每次绘制结果一致。
 */
export function drawDemoCover(
  ctx: CanvasRenderingContext2D,
  opts: DemoCoverOptions
): void {
  const { x, y, w, h, seed, title } = opts;
  if (w <= 0 || h <= 0) return;

  // 简单可复现的伪随机（mulberry32 变体）
  let rand = (seed + 1) * 2654435761;
  const next = () => {
    rand = (rand * 1103515245 + 12345) & 0x7fffffff;
    return rand / 0x7fffffff;
  };

  // —— 深色底（垂直方向的极缓渐变，避免死平）——
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, '#1a1b20');
  bg.addColorStop(1, '#121316');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  // —— 细几何图形（低对比线条，按母题绘制）——
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const cx = x + w / 2;
  const cy = y + h / 2;
  const motif = seed % MOTIF_COUNT;
  ctx.lineWidth = Math.max(1, Math.round(w / 512));
  ctx.strokeStyle = 'rgba(120, 128, 142, 0.30)';
  ctx.fillStyle = 'rgba(120, 128, 142, 0.22)';

  if (motif === 0) {
    // 同心圆弧：偏心的一组细环
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx + w * 0.12, cy - h * 0.06, (Math.min(w, h) * 0.62 * i) / 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (motif === 1) {
    // 斜线网格：细密的平行斜线
    const step = Math.max(14, w / 26);
    ctx.beginPath();
    for (let sx = x - h; sx < x + w + h; sx += step) {
      ctx.moveTo(sx, y + h);
      ctx.lineTo(sx + h, y);
    }
    ctx.stroke();
  } else if (motif === 2) {
    // 三角阵列：底边对齐的细描边三角
    const count = 5;
    const tw = w / (count + 1);
    for (let i = 0; i < count; i++) {
      const bx = x + tw * (i + 0.5) + tw / 2;
      const th = h * (0.22 + 0.5 * next());
      ctx.beginPath();
      ctx.moveTo(bx, y + h - h * 0.2);
      ctx.lineTo(bx - tw * 0.42, y + h - h * 0.2);
      ctx.lineTo(bx - tw * 0.21, y + h - h * 0.2 - th);
      ctx.closePath();
      ctx.stroke();
    }
  } else if (motif === 3) {
    // 波纹：若干条正弦细线
    const lines = 5;
    for (let l = 0; l < lines; l++) {
      const ly = y + (h * (l + 1)) / (lines + 1);
      ctx.beginPath();
      for (let px = 0; px <= w; px += Math.max(4, w / 90)) {
        const t = px / w;
        const yy =
          ly +
          Math.sin(t * Math.PI * (2 + l) + next() * 0.6) * h * 0.06 * (l + 1) * 0.5;
        if (px === 0) ctx.moveTo(x + px, yy);
        else ctx.lineTo(x + px, yy);
      }
      ctx.stroke();
    }
  } else {
    // 点阵：确定性散布的小方点
    const cols = 12;
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (next() > 0.55) continue;
        const px = x + ((c + 0.5) / cols) * w;
        const py = y + ((r + 0.5) / rows) * h;
        const s = Math.max(1.5, w / 256);
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      }
    }
  }
  ctx.restore();

  // —— 作品标题（淡灰衬线大字，居中偏左下，克制）——
  if (title) {
    const fontSize = Math.max(18, Math.round(h * 0.17));
    ctx.save();
    ctx.font = `600 ${fontSize}px "Songti SC", "Noto Serif SC", Georgia, serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, x + w * 0.08, y + h * 0.82);
    ctx.restore();
  }

  // —— 「演示封面」标注（右下角小字 + 前缀小方点，明确非真实素材）——
  const tagSize = Math.max(10, Math.round(h * 0.045));
  ctx.save();
  ctx.font = `400 ${tagSize}px -apple-system, "PingFang SC", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const tagX = x + w - w * 0.035;
  const tagY = y + h - h * 0.075;
  ctx.fillText('演示封面', tagX, tagY);
  // 前缀小方点
  const dotS = tagSize * 0.34;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(tagX - tagSize * 2.55 - dotS, tagY - dotS / 2, dotS, dotS);
  ctx.restore();
}