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

const ARC_RADIUS = 6;

const SEGMENTS_PER_CELL = 28;

const VERTICAL_SEGMENTS = 24;

const CAMERA_FOV = 23.7;

const CURVED_VIEW_SCALE = 1.55;

const CELL_ASPECT = 0.64;

const DESKTOP_PARAMS = {
  frameAngle: THREE.MathUtils.degToRad(32),
  coverCells: 5,
  fadeStart: 0.3,
  fadeEnd: 0.72,
} as const;

const COMPACT_PARAMS = {
  frameAngle: THREE.MathUtils.degToRad(24),
  coverCells: 4,
  fadeStart: 0.2,
  fadeEnd: 0.42,
} as const;

type LayoutTier = 'desktop' | 'compact';

const REEL_VERTEX_SHADER = `
  uniform float uPress;
  uniform float uFrameAngle;
  uniform float uRadius;
  uniform float uCoverCells;
  uniform vec2 uPressPoint;
  uniform float uViewportAspect;

  varying vec2 vUv;
  varying float vAngle;
  varying float vPressDent;
  varying float vPressRim;

  void main() {
    vUv = uv;
    float cell = (uv.x - 0.5) * uCoverCells;
    float theta = cell * uFrameAngle;
    float curvedX = uRadius * sin(theta);
    float curvedZ = uRadius * cos(theta);
    vec3 curved = vec3(curvedX, position.y, curvedZ);
    vec4 baseClip = projectionMatrix * modelViewMatrix * vec4(curved, 1.0);
    vec2 screenPoint = baseClip.xy / baseClip.w * 0.5 + 0.5;
    vec2 pressDelta = screenPoint - uPressPoint;
    pressDelta.x *= uViewportAspect;
    float distanceToPress = length(pressDelta);
    float press = smoothstep(0.0, 1.0, uPress);
    float localDent = exp(-distanceToPress * distanceToPress * 72.0) * press;
    float softRim = exp(-distanceToPress * distanceToPress * 24.0) * press;
    vec3 transformed = curved;
    transformed.x -= pressDelta.x * softRim * 0.72;
    transformed.y -= pressDelta.y * softRim * 0.5;
    transformed.z += localDent * 0.52;
    vAngle = theta;
    vPressDent = localDent;
    vPressRim = softRim;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const REEL_FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform float uOffset;        // 滚动偏移（帧格单位，浮点，传入前已按 N 取模控幅）
  uniform float uCells;         // 总帧格数（= 作品数，循环周期）
  uniform float uCoverCells;    // 几何覆盖帧格数（重建几何时同步，保证 cellX 映射一致）
  uniform float uFadeStart;     // 亮度衰减起始角（rad）
  uniform float uFadeEnd;       // 亮度衰减结束角（rad）
  uniform float uSideBrightness;// 两侧最暗亮度
  uniform float uBlurStrength;  // 假景深：mipmap LOD 偏移强度
  #define MAX_VIDEO_SLOTS 8
  uniform sampler2D uVideoTexs[MAX_VIDEO_SLOTS];  // 视频纹理（空 slot 绑 1x1 黑色占位纹理）
  uniform float uVideoCells[MAX_VIDEO_SLOTS];     // 各 slot 所在格索引（[0, uCells)）
  uniform vec4 uVideoUVRects[MAX_VIDEO_SLOTS];    // 各 slot contain 采样子矩形（x1, y1, x2, y2）
  uniform float uVideoOns[MAX_VIDEO_SLOTS];       // 各 slot 画面混合系数（0~1，自动淡入淡出）
  uniform float uVideoSlots;                      // 实际启用的 slot 数
  uniform vec4 uFrameRect;                        // cell 内画面区（x, y, w, h；y 自画面底部起）

  varying vec2 vUv;
  varying float vAngle;
  varying float vPressDent;
  varying float vPressRim;

  void main() {
    float cellX = vUv.x * uCoverCells - uCoverCells * 0.5 + uOffset;
    vec2 tuv = vec2(fract(cellX / uCells + 0.5 / uCells), vUv.y);

    float t = smoothstep(uFadeStart, uFadeEnd, abs(vAngle));

    vec4 baseSample = texture2D(uMap, tuv, uBlurStrength * t);
    vec3 base = baseSample.rgb;
    float baseAlpha = baseSample.a;

    if (uVideoSlots > 0.5 && vUv.y > uFrameRect.y && vUv.y < uFrameRect.y + uFrameRect.w) {
      float halfW = uFrameRect.z * 0.5; // 画面区半宽（帧格单位）
      for (int i = 0; i < MAX_VIDEO_SLOTS; i++) {
        if (float(i) < uVideoSlots) {
          float on = uVideoOns[i];
          if (on > 0.001) {
            float c = uVideoCells[i];
            float d = cellX - (c + uCells * floor((cellX - c) / uCells + 0.5));
            if (abs(d) < halfW) {
              vec2 fuv = vec2((d + halfW) / uFrameRect.z, (vUv.y - uFrameRect.y) / uFrameRect.w);
              vec4 r = uVideoUVRects[i];
              vec2 vuv = mix(r.xy, r.zw, vec2(1.0 - fuv.x, fuv.y));
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
              baseAlpha = mix(baseAlpha, 1.0, on);
            }
          }
        }
      }
    }

    vec3 col = base * mix(1.0, uSideBrightness, t);
    float dentShade = vPressDent * 0.14;
    float rimLight = max(vPressRim - vPressDent, 0.0) * 0.055;
    col = col * (1.0 - dentShade) + vec3(rimLight);
    gl_FragColor = vec4(col, baseAlpha);
  }
`;

export interface FilmStripReelHandle {
  setOffset: (offset: number) => void;
  requestRender: () => void;
  setVideoSlot: (slot: number, tex: THREE.VideoTexture | null, cellIndex: number) => void;
  setVideoSlotUVRect: (slot: number, x1: number, y1: number, x2: number, y2: number) => void;
  setVideoSlotVisible: (slot: number, on: boolean) => void;
  getFrameAspect: () => number;
  setRenderingEnabled: (enabled: boolean) => void;
  getFrameWidthPx: () => number;
  setPressDepth: (depth: number) => void;
  setPressPoint: (x: number, y: number) => void;
}

export const MAX_VIDEO_SLOTS = 8;

export type ReelErrorReason =
  | 'webgl-unavailable'
  | 'renderer-failed';

declare global {
  interface Window {
    __reelRenderCount?: number;
  }
}

export interface FilmStripReelProps {
  items: ShowcaseItem[];
  offset?: number;
  onReady?: (phase: 'layout' | 'images') => void;
  onError?: (reason: ReelErrorReason) => void;
}

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
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function resolveLayoutTier(width: number): LayoutTier {
  return width < 640 ? 'compact' : 'desktop';
}

export const FilmStripReel = memo(
  forwardRef<FilmStripReelHandle, FilmStripReelProps>(function FilmStripReel(
    { items, offset = 0, onReady, onError },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [webglFailed, setWebglFailed] = useState(false);

    const runtimeRef = useRef<{
      material: THREE.ShaderMaterial;
      markDirty: () => void;
      cells: number;
      frameAspect: number;
      setVideoSlot: (slot: number, tex: THREE.VideoTexture | null, cellIndex: number) => void;
      setVideoSlotVisible: (slot: number, on: boolean) => void;
      setRenderingEnabled: (enabled: boolean) => void;
      getFrameWidthPx: () => number;
      setPressDepth: (depth: number) => void;
      setPressPoint: (x: number, y: number) => void;
    } | null>(null);

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !isWebGLAvailable()) {
        setWebglFailed(true);
        onError?.('webgl-unavailable');
        return;
      }

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

      const camera = new THREE.PerspectiveCamera(CAMERA_FOV * CURVED_VIEW_SCALE, 1, 0.1, 50);
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, ARC_RADIUS);

      const scene = new THREE.Scene();

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

      const placeholderTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
      placeholderTex.needsUpdate = true;
      const frameRect = new THREE.Vector4(
        layout.frameX / layout.cellW,
        1 - (layout.frameY + layout.frameH) / layout.cellH,
        layout.frameW / layout.cellW,
        layout.frameH / layout.cellH
      );

      let tier: LayoutTier = 'desktop';
      let frameAngle: number = DESKTOP_PARAMS.frameAngle;
      let coverCells: number = DESKTOP_PARAMS.coverCells;
      let fovDeg: number = CAMERA_FOV;

      const material = new THREE.ShaderMaterial({
        vertexShader: REEL_VERTEX_SHADER,
        fragmentShader: REEL_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: texture },
          uOffset: { value: offset },
          uCells: { value: Math.max(items.length, 1) },
          uCoverCells: { value: coverCells },
          uPress: { value: 0 },
          uFrameAngle: { value: frameAngle },
          uRadius: { value: ARC_RADIUS },
          uPressPoint: { value: new THREE.Vector2(0.5, 0.5) },
          uViewportAspect: { value: 1 },
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

      let dirty = true;
      const markDirty = () => {
        dirty = true;
      };
      const videoOnTargets = new Array(MAX_VIDEO_SLOTS).fill(0) as number[];
      const videoTexActive = new Array(MAX_VIDEO_SLOTS).fill(false) as boolean[];
      let pressTarget = 0;
      let lastLoopTime = performance.now();
      const loop = (time: number) => {
        const dt = Math.max(0, Math.min((time - lastLoopTime) / 1000, 0.1));
        lastLoopTime = time;
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
        const uPress = material.uniforms.uPress as { value: number };
        if (Math.abs(uPress.value - pressTarget) > 0.0005) {
          uPress.value += (pressTarget - uPress.value) * (1 - Math.exp(-dt / 0.085));
          if (Math.abs(uPress.value - pressTarget) <= 0.0015) uPress.value = pressTarget;
          dirty = true;
        }
        if (anyActive) dirty = true;
        if (dirty) {
          renderer.render(scene, camera);
          dirty = false;
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
        const uSlots = material.uniforms.uVideoSlots as { value: number };
        if (tex && uSlots.value < slot + 1) uSlots.value = slot + 1;
        videoTexActive[slot] = !!tex;
        dirty = true;
      };
      const setVideoSlotVisible = (slot: number, on: boolean) => {
        if (slot < 0 || slot >= MAX_VIDEO_SLOTS) return;
        videoOnTargets[slot] = on ? 1 : 0;
      };
      const setRenderingEnabled = (enabled: boolean) => {
        renderer.setAnimationLoop(enabled ? loop : null);
        if (enabled) {
          lastLoopTime = performance.now();
          dirty = true;
        }
      };
      const setPressDepth = (depth: number) => {
        pressTarget = THREE.MathUtils.clamp(depth, 0, 1);
        dirty = true;
      };
      const setPressPoint = (x: number, y: number) => {
        (material.uniforms.uPressPoint as { value: THREE.Vector2 }).value.set(
          THREE.MathUtils.clamp(x, 0, 1),
          THREE.MathUtils.clamp(y, 0, 1)
        );
        dirty = true;
      };
      const getFrameWidthPx = () => {
        const halfVfov = THREE.MathUtils.degToRad(camera.fov) / 2;
        const halfHfov = Math.atan(Math.tan(halfVfov) * camera.aspect);
        const viewWorldW = 2 * ARC_RADIUS * Math.tan(halfHfov);
        if (viewWorldW <= 0) return 0;
        return ((ARC_RADIUS * frameAngle) / viewWorldW) * container.clientWidth;
      };

      const rebuildGeometry = (nextTier: LayoutTier) => {
        tier = nextTier;
        const p = nextTier === 'compact' ? COMPACT_PARAMS : DESKTOP_PARAMS;
        frameAngle = p.frameAngle;
        coverCells = p.coverCells;
        const oldGeometry = mesh.geometry;
        mesh.geometry = buildReelGeometry(frameAngle, coverCells);
        oldGeometry.dispose();
        (material.uniforms.uCoverCells as { value: number }).value = coverCells;
        (material.uniforms.uFrameAngle as { value: number }).value = frameAngle;
        (material.uniforms.uFadeStart as { value: number }).value = p.fadeStart;
        (material.uniforms.uFadeEnd as { value: number }).value = p.fadeEnd;
        markDirty();
      };

      const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w <= 0 || h <= 0) return;
        renderer.setSize(w, h, false); // 不覆写 CSS，画布铺满由样式控制
        const aspect = w / h;
        camera.aspect = aspect;
        (material.uniforms.uViewportAspect as { value: number }).value = aspect;

        const nextTier = resolveLayoutTier(w);
        if (nextTier !== tier) rebuildGeometry(nextTier);

        const nextFov = 2 * THREE.MathUtils.radToDeg(Math.atan((frameAngle * CELL_ASPECT) / 2));
        if (nextFov !== fovDeg) {
          fovDeg = nextFov;
          camera.fov = nextFov * CURVED_VIEW_SCALE;
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
        setPressDepth,
        setPressPoint,
      };
      onReady?.('layout');

      let disposed = false;
      fillFrameImages(canvas, layout, items)
        .then((touched) => {
          if (disposed || !touched) return;
          texture.needsUpdate = true; // 重绘后的画布重新上传
          markDirty();
          onReady?.('images');
        })
        .catch(() => {
        });

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
    }, [items, onError]);

    useEffect(() => {
      const rt = runtimeRef.current;
      if (!rt) return;
      (rt.material.uniforms.uOffset as { value: number }).value = offset;
      rt.markDirty();
    }, [offset]);

    useImperativeHandle(
      ref,
      () => ({
        setOffset: (value: number) => {
          const rt = runtimeRef.current;
          if (!rt) return;
          const cells = rt.cells;
          const o = ((value % cells) + cells) % cells;
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
        setPressDepth: (depth: number) => {
          runtimeRef.current?.setPressDepth(depth);
        },
        setPressPoint: (x: number, y: number) => {
          runtimeRef.current?.setPressPoint(x, y);
        },
      }),
      []
    );

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
