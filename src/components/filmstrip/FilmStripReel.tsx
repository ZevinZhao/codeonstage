// ============================================================
// FilmStripReel - Three.js 横向弯曲 35mm 胶卷（曲面银幕）
// ------------------------------------------------------------
// 实现要点（对应静态构图阶段的验收要求）：
// 1. 连续曲面：自定义 BufferGeometry，顶点沿圆弧横向分布
//    （覆盖若干帧格的弧段，每格 18 段细分），凹面朝向观众，
//    相机位于弧心附近 —— 而非「三张独立平面卡片旋转」的偷懒方案。
// 2. 整体连续移动：整条胶卷（画面 + 胶片边框 + 上下齿孔）绘制在
//    一张程序化 Canvas 拼图纹理上（12 帧格横向拼接），滚动 =
//    着色器内按 12 帧周期对采样坐标取模（wrapS=RepeatWrapping），
//    首尾天然无缝循环；滚动由浮点 offset 驱动（父组件给）。
// 3. 亮度/景深：片元着色器按顶点与中央的夹角做 smoothstep 衰减
//    （中央最亮，向两侧平滑变暗），并叠加 mipmap LOD 偏移模拟
//    两侧轻微失焦（假景深），全程无突变。
// 4. 渲染质量：透明背景（透出 CSS 深灰径向渐变）、pixelRatio 上限 2、
//    anisotropic 过滤、ResizeObserver 自适应、按需渲染（dirty 标记）。
// 5. 交互接入：offset 命令式句柄 setOffset（免 React 渲染高频写 uniform，
//    自动滚动 / 手动切换由 useFilmstrip 状态机驱动）；视频以多 VideoTexture
//    slot 常驻接入同一 shader 采样（uVideoTexs/uVideoCells/uVideoOns 数组），
//    自动巡游滚动时所有视频格同时循环播放，曲率与封面一致。
// 6. 响应式几何（适配阶段）：按容器尺寸分两档——
//    desktop（宽 ≥768 且 aspect ≥1.2）：每格 32°、覆盖 5 格；
//    compact（窄视口/竖屏）：每格 24°、覆盖 4 格（弧更平、两侧露出更少），
//    并按容器宽高比反推垂直 fov，使中央格约占视口宽 85%。
//    尺寸档变化时重建几何（ResizeObserver 内判定，同档只更新 fov/aspect）。
//    重建时同步 uCoverCells —— cellX 映射（uv → 格坐标）只依赖该 uniform，
//    纹理循环采样逻辑与几何角度无关，采样一致性由此保证。
// 7. WebGL 失败上报（onError）：isWebGLAvailable() 为假或渲染器创建抛错
//    时上报父组件，由父组件切换到 HTML 降级轮播（FilmstripFallback）。
// ============================================================
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  memo,
} from 'react';
import * as THREE from 'three';
import type { ShowcaseItem } from '@/data/showcase';
import { isWebGLAvailable } from './webgl';
import { createFilmCanvas, fillFrameImages } from './filmTexture';

// ------------------------------------------------------------
// 场景几何参数（世界尺度固定，不随窗口重建）
// ------------------------------------------------------------

/** 胶卷弧半径（世界单位）：相机置于弧心，到胶卷各点等距 */
const ARC_RADIUS = 6;

/** 横向每帧格细分段数（保证弧面平滑） */
const SEGMENTS_PER_CELL = 18;

/** 纵向细分段数（法线/插值平滑用） */
const VERTICAL_SEGMENTS = 6;

/** 相机垂直视场角基准（26°：桌面布局下胶卷高约占容器高 90%，上下留呼吸空隙） */
const CAMERA_FOV = 26;

/** compact 档垂直视场上限（deg）：极端竖长容器下限制视野避免畸变 */
const COMPACT_FOV_MAX = 55;

/** compact 档中央格目标视口宽占比（fov 反推依据） */
const COMPACT_CELL_VIEW_RATIO = 0.85;

/** 帧格宽高比（与 filmTexture 的 CELL_ASPECT 一致：cellH = 0.75 × cellW） */
const CELL_ASPECT = 0.75;

/** 桌面档参数：每格 32°（16:9 下中央格约占视口宽 55%~60%）、覆盖 5 格 */
const DESKTOP_PARAMS = {
  frameAngle: THREE.MathUtils.degToRad(32),
  coverCells: 5,
  /** 亮度衰减起始角（rad，中央格边缘约 17° 后开始变暗） */
  fadeStart: 0.3,
  /** 亮度衰减结束角（rad，约 41° 到最暗，覆盖桌面可视远端） */
  fadeEnd: 0.72,
} as const;

/** 紧凑档参数（窄视口/竖屏）：每格 24°（弧更平）、覆盖 4 格、两侧露出更少 */
const COMPACT_PARAMS = {
  frameAngle: THREE.MathUtils.degToRad(24),
  coverCells: 4,
  /** 亮度衰减起始角（rad）：中央格边缘 12°=0.21，稍早进入衰减 */
  fadeStart: 0.2,
  /** 亮度衰减结束角（rad）：窄视野下更快到最暗 */
  fadeEnd: 0.42,
} as const;

/** 几何尺寸档（resize 时判定，跨档才重建几何） */
type LayoutTier = 'desktop' | 'compact';

// ------------------------------------------------------------
// 着色器（GLSL ES 1.0，Three 对 WebGL2 上下文同样兼容）
// ------------------------------------------------------------

const REEL_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vAngle;

  void main() {
    vUv = uv;
    // 与中央的夹角（弧心在原点、胶卷在 +z 半空间，atan 值域 ±80° 内无歧义）
    vAngle = atan(position.x, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const REEL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOffset;        // 滚动偏移（帧格单位，浮点，传入前已按 N 取模控幅）
  uniform float uCells;         // 总帧格数（= 作品数，循环周期）
  uniform float uCoverCells;    // 几何覆盖帧格数（重建几何时同步，保证 cellX 映射一致）
  uniform float uFadeStart;     // 亮度衰减起始角（rad）
  uniform float uFadeEnd;       // 亮度衰减结束角（rad）
  uniform float uSideBrightness;// 两侧最暗亮度
  uniform float uBlurStrength;  // 假景深：mipmap LOD 偏移强度
  // —— 视频播放（多 VideoTexture 常驻，沿曲面采样，保持曲率一致）——
  // 自动巡游滚动时所有视频格同时循环播放：每个有视频的条目占一个
  // slot（纹理 + 格索引 + contain 子矩形 + 独立淡入系数）。
  #define MAX_VIDEO_SLOTS 8
  uniform sampler2D uVideoTexs[MAX_VIDEO_SLOTS];  // 视频纹理（空 slot 绑 1x1 黑色占位纹理）
  uniform float uVideoCells[MAX_VIDEO_SLOTS];     // 各 slot 所在格索引（[0, uCells)）
  uniform vec4 uVideoUVRects[MAX_VIDEO_SLOTS];    // 各 slot contain 采样子矩形（x1, y1, x2, y2）
  uniform float uVideoOns[MAX_VIDEO_SLOTS];       // 各 slot 画面混合系数（0~1，自动淡入淡出）
  uniform float uVideoSlots;                      // 实际启用的 slot 数
  uniform vec4 uFrameRect;                        // cell 内画面区（x, y, w, h；y 自画面底部起）

  varying vec2 vUv;
  varying float vAngle;

  void main() {
    // 几何 uv.x ∈ [0,1] → 帧格坐标 ∈ [-cover/2, cover/2]，加滚动偏移后
    // 按「整条胶卷 N 格」周期取模 —— 首尾无缝循环的关键。
    // cellX 只依赖 uCoverCells（几何覆盖格数），与每格角度无关：
    // 重建几何（换 frameAngle）只要同步 uCoverCells，采样映射不变。
    float cellX = vUv.x * uCoverCells - uCoverCells * 0.5 + uOffset;
    // 纹理坐标 = (cellX + 半格) / N：cell k 中心（cellX=k）采样纹理
    // 第 k 格中心 (k+0.5)/N，左右边缘 k±0.5 恰好落在 [k/N, (k+1)/N]。
    // 注意 +0.5 必须除以 N（半格 0.5/N）：若写成 +0.5（纹理坐标半幅，
    // 即 N/2 格的周期）会把映射整体错开半周期（12 格时错位 6 格）。
    vec2 tuv = vec2(fract(cellX / uCells + 0.5 / uCells), vUv.y);

    // 沿弧面的位置连续亮度衰减：中央最亮，两侧平滑变暗（无突变）
    float t = smoothstep(uFadeStart, uFadeEnd, abs(vAngle));

    // 假景深：两侧用更高的 mipmap 层级采样，视觉上轻微失焦
    vec3 base = texture2D(uMap, tuv, uBlurStrength * t).rgb;

    // —— 视频格（多 slot 常驻循环播放）：命中 slot 的画面区内以对应
    //    视频纹理替代拼图封面（曲率与亮度衰减保持一致）——
    if (uVideoSlots > 0.5 && vUv.y > uFrameRect.y && vUv.y < uFrameRect.y + uFrameRect.w) {
      float halfW = uFrameRect.z * 0.5; // 画面区半宽（帧格单位）
      for (int i = 0; i < MAX_VIDEO_SLOTS; i++) {
        if (float(i) < uVideoSlots) {
          float on = uVideoOns[i];
          if (on > 0.001) {
            // 循环最近同余代表：滚动中视频格中心判定连续无跳变
            // （代表值切换发生在 |d| ≥ N/2 - halfW 处，画面不在屏幕上）
            float c = uVideoCells[i];
            float d = cellX - (c + uCells * floor((cellX - c) / uCells + 0.5));
            if (abs(d) < halfW) {
              // 画面区内归一化坐标 → contain 映射后的视频纹理 uv。
              // 采样 x 取反（水平镜像还原）：VideoTexture 采样路径与拼图
              // 封面不同，实测输出左右镜像 —— 在此处直接翻回，不影响封面格。
              vec2 fuv = vec2((d + halfW) / uFrameRect.z, (vUv.y - uFrameRect.y) / uFrameRect.w);
              vec4 r = uVideoUVRects[i];
              vec2 vuv = mix(r.xy, r.zw, vec2(1.0 - fuv.x, fuv.y));
              // GLSL ES 1.0：sampler 数组只允许字面常量索引（循环变量
              // 仅可用于非采样器 uniform 数组）→ 采样分支按 i 展开
              vec3 vcol = vec3(0.0);
              if (i == 0) {
                vcol = texture2D(uVideoTexs[0], vuv).rgb;
              } else if (i == 1) {
                vcol = texture2D(uVideoTexs[1], vuv).rgb;
              } else if (i == 2) {
                vcol = texture2D(uVideoTexs[2], vuv).rgb;
              } else if (i == 3) {
                vcol = texture2D(uVideoTexs[3], vuv).rgb;
              } else if (i == 4) {
                vcol = texture2D(uVideoTexs[4], vuv).rgb;
              } else if (i == 5) {
                vcol = texture2D(uVideoTexs[5], vuv).rgb;
              } else if (i == 6) {
                vcol = texture2D(uVideoTexs[6], vuv).rgb;
              } else {
                vcol = texture2D(uVideoTexs[7], vuv).rgb;
              }
              base = mix(base, vcol, on);
            }
          }
        }
      }
    }

    vec3 col = base * mix(1.0, uSideBrightness, t);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ------------------------------------------------------------
// 组件接口
// ------------------------------------------------------------

/** 命令式句柄：供交互阶段高频驱动（绕过 React 渲染直接写 uniform） */
export interface FilmStripReelHandle {
  /**
   * 直接设置浮点帧偏移（与 props.offset 同语义，但不触发 React 渲染）。
   * 传入前组件内部按 N 取模控幅（周期 N 下画面等价，避免大数精度损失）。
   */
  setOffset: (offset: number) => void;
  /** 手动请求一次重绘（纹理/视口外部变化时用） */
  requestRender: () => void;
  /**
   * 绑定/解绑某 slot 的视频纹理（null = 解除绑定并停止该 slot 的
   * 每帧重绘；淡出由 setVideoSlotVisible 驱动）。cellIndex 为该视频
   * 所在格索引（[0, items.length)），绑定即固定，滚动判定在 shader 内
   * 按循环同余代表连续完成。
   */
  setVideoSlot: (slot: number, tex: THREE.VideoTexture | null, cellIndex: number) => void;
  /** 设置某 slot 视频纹理 contain 采样子矩形（uv 空间 x1,y1,x2,y2） */
  setVideoSlotUVRect: (slot: number, x1: number, y1: number, x2: number, y2: number) => void;
  /** 某 slot 视频画面可见性（内部以约 300ms 淡入淡出过渡，非瞬时切换） */
  setVideoSlotVisible: (slot: number, on: boolean) => void;
  /** 画面区实际宽高比（frameW/frameH 像素比，供 contain 计算；无场景时回退 16:9） */
  getFrameAspect: () => number;
  /**
   * 开关渲染循环（页面隐藏/胶卷离屏时置 false 省电；恢复置 true 时
   * 强制重绘一帧）。无 Three 场景（降级）时安全空操作。
   */
  setRenderingEnabled: (enabled: boolean) => void;
  /**
   * 中央帧格在屏幕上的像素宽（触摸拖动「位移 → 帧偏移」换算基准；
   * 由弧长/水平视野/视口宽换算，随几何档与 fov 自适应）。
   * 无 Three 场景时返回 0。
   */
  getFrameWidthPx: () => number;
}

/** 视频 slot 上限（与 shader MAX_VIDEO_SLOTS 一致；超出部分不接入曲面播放） */
export const MAX_VIDEO_SLOTS = 8;

/** WebGL 失败原因（上报父组件切换降级 UI） */
export type ReelErrorReason =
  /** WebGL 上下文不可用（isWebGLAvailable() 为假） */
  | 'webgl-unavailable'
  /** Three 渲染器创建抛错（上下文丢失/驱动黑名单等） */
  | 'renderer-failed';

declare global {
  interface Window {
    /** DEV 验证钩子：renderer.render 累计调用数（按需渲染/静止态零绘制断言用） */
    __reelRenderCount?: number;
  }
}

/** 组件 props */
export interface FilmStripReelProps {
  /** 精选作品列表（决定胶卷帧格内容与循环周期） */
  items: ShowcaseItem[];
  /** 浮点帧偏移：0 = items[0] 居中；增加 1 = 下一格进入中央（父组件驱动） */
  offset?: number;
  /** 资源就绪回调（'layout' = 场景可渲染；'images' = 真实封面填充完成） */
  onReady?: (phase: 'layout' | 'images') => void;
  /** WebGL 初始化失败回调（上层据此切换 HTML 降级轮播；引用需稳定） */
  onError?: (reason: ReelErrorReason) => void;
}

// ------------------------------------------------------------
// 几何构建：连续弧面网格
// ------------------------------------------------------------

/**
 * 生成胶卷弧面几何：横向沿圆弧分布（连续曲面），
 * 顶点 y 决定高度，x/z 按角度落弧。uv.x 横向归一化（0 = 左端）。
 * @param frameAngle 每帧格圆心角（rad）
 * @param coverCells 覆盖帧格数（与材质 uCoverCells 一致）
 */
function buildReelGeometry(frameAngle: number, coverCells: number): THREE.BufferGeometry {
  const cellArc = ARC_RADIUS * frameAngle; // 单帧格弧长
  const heightWorld = cellArc * CELL_ASPECT; // 帧格世界高度（与纹理 cell 同比例）

  const widthSegments = coverCells * SEGMENTS_PER_CELL;
  const halfCover = coverCells / 2;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= VERTICAL_SEGMENTS; iy++) {
    const v = iy / VERTICAL_SEGMENTS; // 0 = 底边
    const y = (v - 0.5) * heightWorld;
    for (let ix = 0; ix <= widthSegments; ix++) {
      const u = ix / widthSegments; // 0 = 左端
      const theta = (u * coverCells - halfCover) * frameAngle;
      const x = ARC_RADIUS * Math.sin(theta);
      const z = ARC_RADIUS * Math.cos(theta);
      positions.push(x, y, z);
      // CanvasTexture flipY = true：uv v=0 对应画布底行，与几何底边对齐
      uvs.push(u, v);
    }
  }

  const rowLen = widthSegments + 1;
  for (let iy = 0; iy < VERTICAL_SEGMENTS; iy++) {
    for (let ix = 0; ix < widthSegments; ix++) {
      const a = iy * rowLen + ix;
      const b = a + 1;
      const c = a + rowLen;
      const d = c + 1;
      // 两个三角形（正面向观众：相机在原点看向 +z，弧面在 +z，
      // 正面法线朝 -z 方向 → 逆时针从相机视角看是 (a, c, b) 组合）
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * 按容器尺寸判定几何档：窄视口（<768px）或接近竖屏（aspect < 1.2）
 * 走 compact（弧更平、每格更宽占比）；否则 desktop。
 */
function resolveLayoutTier(width: number, aspect: number): LayoutTier {
  return width < 768 || aspect < 1.2 ? 'compact' : 'desktop';
}

/**
 * compact 档垂直 fov（deg）：由「中央格约占视口宽 85%」反推。
 * 水平视野半角需容纳 frameAngle/2 / 0.85，再经 aspect 换算垂直 fov，
 * 并 clamp 到 [CAMERA_FOV, COMPACT_FOV_MAX]（极端比例容器下保底/封顶）。
 */
function compactFovDeg(frameAngle: number, aspect: number): number {
  const halfHfovTan = Math.tan(frameAngle / 2 / COMPACT_CELL_VIEW_RATIO);
  const fov = 2 * THREE.MathUtils.radToDeg(Math.atan(halfHfovTan / aspect));
  return THREE.MathUtils.clamp(fov, CAMERA_FOV, COMPACT_FOV_MAX);
}

// ------------------------------------------------------------
// 组件实现
// ------------------------------------------------------------

/**
 * 胶卷卷轴组件：铺满父容器（父容器需 position: relative + 明确尺寸）。
 * 静态阶段默认 offset = 0 渲染中央条目；交互阶段由父组件驱动 offset。
 * WebGL 不可用/初始化失败时上报 onError，组件自身渲染 null，
 * 由父组件渲染完整的 HTML 降级轮播（FilmstripFallback）。
 */
export const FilmStripReel = memo(
  forwardRef<FilmStripReelHandle, FilmStripReelProps>(function FilmStripReel(
    { items, offset = 0, onReady, onError },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    // Three 初始化失败（初始化前检测 + 渲染器创建抛错两路来源）
    const [webglFailed, setWebglFailed] = useState(false);

    // 指向 Three 运行时的可变引用（effect 内创建/销毁）。
    // 几何档/fov 等连续状态以 effect 闭包变量为真源（rebuild/resize 内更新），
    // 此处仅暴露外部需要的命令式入口。
    const runtimeRef = useRef<{
      material: THREE.ShaderMaterial;
      markDirty: () => void;
      /** 帧格总数（循环周期） */
      cells: number;
      /** 画面区实际宽高比（frameW / frameH） */
      frameAspect: number;
      setVideoSlot: (slot: number, tex: THREE.VideoTexture | null, cellIndex: number) => void;
      setVideoSlotVisible: (slot: number, on: boolean) => void;
      setRenderingEnabled: (enabled: boolean) => void;
      getFrameWidthPx: () => number;
    } | null>(null);

    // —— 初始化 / 销毁 Three 场景（幂等，StrictMode 双挂载安全）——
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !isWebGLAvailable()) {
        setWebglFailed(true);
        onError?.('webgl-unavailable');
        return;
      }

      // —— 渲染器（透明背景，透出 CSS 深灰径向渐变）——
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        setWebglFailed(true);
        onError?.('renderer-failed');
        return;
      }
      renderer.setClearColor(0x000000, 0); // 完全透明
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // pixelRatio 上限 2
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      // —— 相机：置于弧心，看向 +z（胶卷中央格）——
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, ARC_RADIUS);

      // —— 场景（背景 null = 透明）——
      const scene = new THREE.Scene();

      // —— 纹理：按设备最大纹理尺寸自适应帧格分辨率 ——
      const maxTex = renderer.capabilities.maxTextureSize;
      const cellW = Math.max(
        240,
        Math.min(768, Math.floor(maxTex / Math.max(items.length, 1) / 8) * 8)
      );
      const { canvas, layout } = createFilmCanvas(items, cellW);
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping; // 横向平铺：滚动取模的关键
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      // 注：色彩直通（不设置 SRGBColorSpace）—— 手写着色器无自动
      // 编码转换，采样值即 Canvas 的 sRGB 数值，输出到屏幕保持一致。

      // —— 视频相关 uniform ——
      // 占位纹理（1x1 黑）：无视频时保持采样器绑定合法，避免 undefined 行为
      const placeholderTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
      placeholderTex.needsUpdate = true;
      // 画面区矩形（cell 归一化）：canvas 的 y 向下 + 纹理 flipY → v = 1 - y/cellH
      const frameRect = new THREE.Vector4(
        layout.frameX / layout.cellW,
        1 - (layout.frameY + layout.frameH) / layout.cellH,
        layout.frameW / layout.cellW,
        layout.frameH / layout.cellH
      );

      // —— 初始几何档（resize 首次调用前先按 desktop 建几何，resize 内
      //     立即按实际容器尺寸校正档位）——
      let tier: LayoutTier = 'desktop';
      let frameAngle: number = DESKTOP_PARAMS.frameAngle;
      let coverCells: number = DESKTOP_PARAMS.coverCells;
      let fovDeg: number = CAMERA_FOV;

      // —— 材质：滚动 + 亮度衰减 + 假景深 + 视频格采样 ——
      const material = new THREE.ShaderMaterial({
        vertexShader: REEL_VERTEX_SHADER,
        fragmentShader: REEL_FRAGMENT_SHADER,
        uniforms: {
          uMap: { value: texture },
          uOffset: { value: offset },
          uCells: { value: Math.max(items.length, 1) },
          uCoverCells: { value: coverCells },
          uFadeStart: { value: DESKTOP_PARAMS.fadeStart },
          uFadeEnd: { value: DESKTOP_PARAMS.fadeEnd },
          uSideBrightness: { value: 0.24 },
          uBlurStrength: { value: 2.2 },
          uVideoTexs: { value: new Array(MAX_VIDEO_SLOTS).fill(placeholderTex) },
          uVideoCells: { value: new Array(MAX_VIDEO_SLOTS).fill(0) },
          uVideoUVRects: {
            value: Array.from({ length: MAX_VIDEO_SLOTS }, () => new THREE.Vector4(0, 0, 1, 1)),
          },
          uVideoOns: { value: new Array(MAX_VIDEO_SLOTS).fill(0) },
          uVideoSlots: { value: 0 },
          uFrameRect: { value: frameRect },
        },
      });

      let geometry = buildReelGeometry(frameAngle, coverCells);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // —— 按需渲染（dirty 标记）：静态零绘制，交互阶段每帧置脏即可 ——
      let dirty = true;
      const markDirty = () => {
        dirty = true;
      };
      // 视频可见性目标与激活纹理标记（供渲染循环做淡入淡出与持续重绘）
      const videoOnTargets = new Array(MAX_VIDEO_SLOTS).fill(0) as number[];
      const videoTexActive = new Array(MAX_VIDEO_SLOTS).fill(false) as boolean[];
      let lastLoopTime = performance.now();
      const loop = (time: number) => {
        // dt 双向 clamp：防后台回来跳变 / 防 rAF 时间戳时钟源偏差的负差帧
        const dt = Math.max(0, Math.min((time - lastLoopTime) / 1000, 0.1));
        lastLoopTime = time;
        // 各 slot uVideoOns 淡入淡出：指数逼近（τ=70ms，约 300ms 内完成）
        const uOns = material.uniforms.uVideoOns as { value: number[] };
        let anyActive = false;
        for (let i = 0; i < MAX_VIDEO_SLOTS; i++) {
          if (uOns.value[i] !== videoOnTargets[i]) {
            if (dt > 0) {
              uOns.value[i] +=
                (videoOnTargets[i] - uOns.value[i]) * (1 - Math.exp(-dt / 0.07));
              if (Math.abs(uOns.value[i] - videoOnTargets[i]) <= 0.0015) {
                uOns.value[i] = videoOnTargets[i];
              }
            }
            dirty = true;
          }
          if (videoTexActive[i]) anyActive = true;
        }
        // 任一视频纹理存在期间持续重绘（VideoTexture 在渲染时自动更新）
        if (anyActive) dirty = true;
        if (dirty) {
          renderer.render(scene, camera);
          dirty = false;
          // DEV 调试计数：renderer.render 累计调用数（Playwright 断言
          // 「静止态零渲染 / 滚动与视频期间持续渲染」用；生产构建被
          // 常量折叠剔除，不进产物）
          if (import.meta.env.DEV) {
            window.__reelRenderCount = (window.__reelRenderCount ?? 0) + 1;
          }
        }
      };
      renderer.setAnimationLoop(loop);
      const setVideoSlot = (slot: number, tex: THREE.VideoTexture | null, cellIndex: number) => {
        if (slot < 0 || slot >= MAX_VIDEO_SLOTS) return;
        (material.uniforms.uVideoTexs as { value: THREE.Texture[] }).value[slot] =
          tex ?? placeholderTex;
        (material.uniforms.uVideoCells as { value: number[] }).value[slot] = cellIndex;
        // 启用 slot 数随绑定自然增长（解绑不清零：on=0 + 占位纹理即等效禁用）
        const uSlots = material.uniforms.uVideoSlots as { value: number };
        if (tex && uSlots.value < slot + 1) uSlots.value = slot + 1;
        videoTexActive[slot] = !!tex;
        dirty = true;
      };
      const setVideoSlotVisible = (slot: number, on: boolean) => {
        if (slot < 0 || slot >= MAX_VIDEO_SLOTS) return;
        videoOnTargets[slot] = on ? 1 : 0;
      };
      // 渲染循环开关（页面隐藏/离屏省电；恢复时强制重绘一帧）
      const setRenderingEnabled = (enabled: boolean) => {
        renderer.setAnimationLoop(enabled ? loop : null);
        if (enabled) {
          lastLoopTime = performance.now();
          dirty = true;
        }
      };
      // 中央帧格屏幕像素宽（触摸拖动换算基准）：弧长 / 水平视野宽 × 视口宽
      const getFrameWidthPx = () => {
        const halfVfov = THREE.MathUtils.degToRad(camera.fov) / 2;
        const halfHfov = Math.atan(Math.tan(halfVfov) * camera.aspect);
        const viewWorldW = 2 * ARC_RADIUS * Math.tan(halfHfov);
        if (viewWorldW <= 0) return 0;
        return ((ARC_RADIUS * frameAngle) / viewWorldW) * container.clientWidth;
      };

      /**
       * 跨档重建几何：dispose 旧几何、按新档重建，并同步材质
       * uCoverCells/uFade*（cellX 采样映射只依赖 uCoverCells，
       * 同步后纹理循环采样与几何重建前完全一致）。
       */
      const rebuildGeometry = (nextTier: LayoutTier) => {
        tier = nextTier;
        const p = nextTier === 'compact' ? COMPACT_PARAMS : DESKTOP_PARAMS;
        frameAngle = p.frameAngle;
        coverCells = p.coverCells;
        const oldGeometry = mesh.geometry;
        mesh.geometry = buildReelGeometry(frameAngle, coverCells);
        oldGeometry.dispose();
        (material.uniforms.uCoverCells as { value: number }).value = coverCells;
        (material.uniforms.uFadeStart as { value: number }).value = p.fadeStart;
        (material.uniforms.uFadeEnd as { value: number }).value = p.fadeEnd;
        markDirty();
      };

      // —— 尺寸自适应（resize 监听：fov/aspect 连续更新，跨档重建几何）——
      const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w <= 0 || h <= 0) return;
        renderer.setSize(w, h, false); // 不覆写 CSS，画布铺满由样式控制
        const aspect = w / h;
        camera.aspect = aspect;

        const nextTier = resolveLayoutTier(w, aspect);
        if (nextTier !== tier) rebuildGeometry(nextTier);

        // fov：desktop 固定 26°；compact 按宽高比反推（中央格约占视口宽 85%）
        const nextFov =
          nextTier === 'compact' ? compactFovDeg(frameAngle, aspect) : CAMERA_FOV;
        if (nextFov !== fovDeg) {
          fovDeg = nextFov;
          camera.fov = nextFov;
        }
        camera.updateProjectionMatrix();
        markDirty();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(container);

      runtimeRef.current = {
        material,
        markDirty,
        cells: Math.max(items.length, 1),
        frameAspect: layout.frameW / layout.frameH,
        setVideoSlot,
        setVideoSlotVisible,
        setRenderingEnabled,
        getFrameWidthPx,
      };
      onReady?.('layout');

      // —— 异步填充真实封面（GIF/图片，contain 不裁切；失败回退演示封面）——
      let disposed = false;
      fillFrameImages(canvas, layout, items)
        .then((touched) => {
          if (disposed || !touched) return;
          texture.needsUpdate = true; // 重绘后的画布重新上传
          markDirty();
          onReady?.('images');
        })
        .catch(() => {
          /* 加载失败已回退为演示封面，无需处理 */
        });

      // —— 清理：释放全部 GPU 资源 ——
      return () => {
        disposed = true;
        observer.disconnect();
        renderer.setAnimationLoop(null);
        texture.dispose();
        mesh.geometry.dispose();
        material.dispose();
        placeholderTex.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        runtimeRef.current = null;
      };
      // items 数组引用稳定（模块级常量），offset 通过独立 effect 同步；
      // onError 需父组件 useCallback 保持稳定（失败上报只在初始化期发生）
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, onError]);

    // —— 声明式 offset 同步（props → uniform）——
    useEffect(() => {
      const rt = runtimeRef.current;
      if (!rt) return;
      (rt.material.uniforms.uOffset as { value: number }).value = offset;
      rt.markDirty();
    }, [offset]);

    // —— 命令式句柄（交互阶段高频驱动用）——
    useImperativeHandle(
      ref,
      () => ({
        setOffset: (value: number) => {
          const rt = runtimeRef.current;
          if (!rt) return;
          const cells = rt.cells;
          // 按 N 取模控幅：周期 N 下画面完全等价（shader 内 fract 周期采样），
          // 同时把 uniform 数值稳定在小范围，避免长时间滚动的大数精度损失
          const o = ((value % cells) + cells) % cells;
          // 静止态跳过重绘（按需渲染）：offset 未变化时不置脏。
          // hover 停留 / cooldown / 观看等静止状态（每帧来自同一 offsetRef，
          // 值恒等）由此实现零绘制；o 为 mod 后的 [0,N) 值，确定性计算下
          // 静止时直接 === 比较即成立。视频播放期间的持续重绘由
          // videoTexActive 机制独立驱动，不受此处跳过影响。
          const uOffset = rt.material.uniforms.uOffset as { value: number };
          if (o === uOffset.value) return;
          uOffset.value = o;
          rt.markDirty();
        },
        requestRender: () => {
          runtimeRef.current?.markDirty();
        },
        setVideoSlot: (slot: number, tex: THREE.VideoTexture | null, cellIndex: number) => {
          const rt = runtimeRef.current;
          if (!rt) return;
          rt.setVideoSlot(slot, tex, cellIndex);
        },
        setVideoSlotUVRect: (slot: number, x1: number, y1: number, x2: number, y2: number) => {
          const rt = runtimeRef.current;
          if (!rt || slot < 0 || slot >= MAX_VIDEO_SLOTS) return;
          (rt.material.uniforms.uVideoUVRects as { value: THREE.Vector4[] }).value[slot].set(
            x1,
            y1,
            x2,
            y2
          );
          rt.markDirty();
        },
        setVideoSlotVisible: (slot: number, on: boolean) => {
          runtimeRef.current?.setVideoSlotVisible(slot, on);
        },
        getFrameAspect: () => runtimeRef.current?.frameAspect ?? 16 / 9,
        setRenderingEnabled: (enabled: boolean) => {
          runtimeRef.current?.setRenderingEnabled(enabled);
        },
        getFrameWidthPx: () => runtimeRef.current?.getFrameWidthPx() ?? 0,
      }),
      []
    );

    // WebGL 失败：渲染 null，由父组件根据 onError 切换完整降级 UI
    if (webglFailed) return null;

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 [&>canvas]:w-full [&>canvas]:h-full"
        aria-hidden="true"
      />
    );
  })
);