// ============================================================
// useFilmstrip - 放映厅胶卷统一交互状态机
// ------------------------------------------------------------
// 用一个有限状态机协调所有 offset 驱动源，任何时刻只有一个源在写
// offset，避免动画争夺。状态优先级（高 → 低）：
//   playing（观看会话有声观看，完全锁定静止）
//   > manual（手动切换 tween 动画中）
//   > drag（触摸拖动中，offset 直接跟手）
//   > hover（鼠标悬停暂停）> auto（自动滚动）
// 状态全集：'auto' | 'hover' | 'resuming' | 'manual' | 'drag'
//         | 'cooldown' | 'playing'
//   - auto：匀速滚动（1 / SCROLL_SECONDS_PER_FRAME 帧/秒）。
//           仅桌面布局且未偏好减少动效时允许（移动端初始即停）。
//   - hover：鼠标进入交互区 → 速度约 150ms 内指数衰减到 0（时间常数 50ms），
//            停在当前位置（不吸附、不跳回中央）
//   - resuming：鼠标离开交互区 → 等 1s → 速度约 300ms 内平滑升回全速
//               （时间常数 100ms），从停止位置继续，绝无跳变
//   - drag：触摸横向拖动 → offset 实时跟手；松手按位移/速度判定
//           snap 到相邻格（720ms ease-in-out-strong）或回弹（350ms）
//   - manual：tween 到目标格（720ms 强 ease-in-out，无弹跳），完成后进入
//            cooldown；观看前居中用更短的 400ms
//   - cooldown：手动操作后的 5s 静止期；到期时鼠标不在区内且无观看才回 auto。
//            移动端 / prefers-reduced-motion 下为永久静止（无到期恢复）
//   - playing：观看会话（点击/空格对中央作品有声观看）期间完全静止。
// 视频双轨制（不占用状态机）：
//   - ambient 常驻：胶卷布局就绪后（startAmbient，由父组件调用一次），
//     为全部有视频的条目（上限 MAX_VIDEO_SLOTS=8）创建静音循环 video，
//     以多 VideoTexture slot 接入 shader —— 自动巡游滚动照常进行，
//     所有视频格同时循环播放，互不打断。
//   - 观看会话：playCurrent（点击中央/空格）对当前条目解除静音进入
//     有声观看（playing 锁定滚动 + 控制条），复用同一 video 元素；
//     结束观看（切换/拖动/手动操作）回到静音 ambient 继续循环。
// 挂起机制（Page Visibility + IntersectionObserver）：
//   页面隐藏或胶卷滚出视口时统一 suspend——暂停主 RAF 循环、Three 渲
//   循环与全部视频播放（观看会话记录播放态）；恢复时 ambient 全部续
//   播、观看视频按记录恢复。
// offset 高频更新走命令式 uniform（不经 React setState）；
// currentIndex / 播放器 UI 等离散状态才 setState（低频）。
// 动效规范：屏幕内移动 ease-in-out-strong；reduced-motion 时滚动与 tween 降级。
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { RefObject } from 'react';
import { MAX_VIDEO_SLOTS, type FilmStripReelHandle } from '@/components/filmstrip/FilmStripReel';
import type { ShowcaseItem } from '@/data/showcase';
import { SCROLL_SECONDS_PER_FRAME } from '@/data/showcase';

// ------------------------------------------------------------
// 状态机参数（全部集中在此，便于调优）
// ------------------------------------------------------------

/** 自动滚动速度（帧/秒）= 1 / 每帧停留秒数 */
const FULL_SPEED = 1 / SCROLL_SECONDS_PER_FRAME;

/** 减速时间常数（s）：150ms 内基本停（指数衰减 95%） */
const STOP_TAU = 0.05;

/** 加速时间常数（s）：300ms 内基本恢复全速 */
const START_TAU = 0.1;

/** 速度小于该值钳到 0（视为完全静止，避免无限指数尾） */
const VELOCITY_EPSILON = 1e-4;

/** 鼠标离开交互区后恢复滚动的延迟（ms） */
const HOVER_RESUME_DELAY_MS = 1000;

/** 手动操作后自动滚动的冷却时长（ms） */
const MANUAL_COOLDOWN_MS = 5000;

/** 手动切换 tween 时长（ms，600-800ms 区间取 720） */
const MANUAL_TWEEN_MS = 720;

/** 观看前居中 tween 时长（ms） */
const CENTER_TWEEN_MS = 400;

/** 触摸松手回弹 tween 时长（ms，300-400ms 区间取 350） */
const SNAP_BACK_MS = 350;

/** 触摸拖动判定为「有意切换」的位移阈值（占一帧格宽度比例） */
const TOUCH_DRAG_THRESHOLD = 0.15;

/** 触摸甩动（fling）判定速度（px/ms，约 450px/s） */
const TOUCH_FLING_VELOCITY = 0.45;

/** 触摸主轴判定阈值（px）：位移超过该值才锁定拖动方向（防点击抖动误触） */
const TOUCH_AXIS_THRESHOLD = 8;

/** 索引切换滞回：偏离锚点超过该帧数才切换（round 自带 ±0.5 + 滞回余量） */
const INDEX_HYSTERESIS = 0.55;

/** ambient 视频加载看门狗超时（ms）：期间无起播进展视为失败（静默回退封面）。
 *  网络较慢时单路起播可达 20-30s，取 45s 兜底 stalled（真实失败由 error
 *  事件先行上报，看门狗仅防御永久挂起） */
const VIDEO_LOAD_TIMEOUT_MS = 45000;

/** ambient 视频错峰启动间隔（ms）：逐路延迟拉流，避免多路并发挤兑带宽 */
const AMBIENT_STAGGER_MS = 1500;

/** 视频加载失败提示自动消失时长（ms） */
const NOTICE_TIMEOUT_MS = 8000;

/** 移动布局媒体查询（与 Tailwind md=768px 断点对齐） */
const NARROW_MQ = '(max-width: 767px)';

/** 触屏主指针媒体查询 */
const COARSE_MQ = '(pointer: coarse)';

/** 减少动效媒体查询 */
const REDUCED_MQ = '(prefers-reduced-motion: reduce)';

// ------------------------------------------------------------
// 类型定义
// ------------------------------------------------------------

/** 状态机状态（对外可读，调试钩子亦暴露） */
export type ReelState =
  | 'auto'
  | 'hover'
  | 'resuming'
  | 'manual'
  | 'drag'
  | 'cooldown'
  | 'playing';

/** 挂起源：Page Visibility 与 IntersectionObserver 各自独立计数 */
type SuspendSource = 'visibility' | 'intersection';

/** 触摸拖动会话（touchstart → touchend/cancel 期间的有效数据） */
interface DragSession {
  /** 主触点 identifier（多指时只跟踪首个） */
  identifier: number;
  /** 触点起始屏幕坐标 */
  startX: number;
  startY: number;
  /** 最近一次 move 的坐标与时刻（速度估算用） */
  lastX: number;
  lastT: number;
  /** 拖动开始的 offset（帧格单位） */
  startOffset: number;
  /** 一帧格在屏幕上的像素宽（锁定拖动时从 Three 句柄获取，跟手换算基准） */
  cellPx: number;
  /** 主轴判定：null = 未判定；'x' = 横向拖动（拖胶卷）；'y' = 纵向（放弃） */
  axis: 'x' | 'y' | null;
  /** 是否已进入横向拖动（锁定状态机、开始跟手） */
  active: boolean;
}

/** 观看会话 UI 状态（离散，低频 setState） */
export interface VideoSessionState {
  /** 会话激活（有声观看中） */
  active: boolean;
  /** 视频实际播放中（false = 暂停观看，胶卷仍锁定静止） */
  playing: boolean;
  /** 是否静音 */
  muted: boolean;
  /** 当前播放位置（秒） */
  currentTime: number;
  /** 总时长（秒，metadata 加载前为 0） */
  duration: number;
  /** 缓冲/等待可播放中 */
  loading: boolean;
}

/** 观看会话空闲态 */
const VIDEO_SESSION_IDLE: VideoSessionState = {
  active: false,
  playing: false,
  muted: false,
  currentTime: 0,
  duration: 0,
  loading: false,
};

/** tween 动画描述 */
interface TweenTask {
  from: number;
  to: number;
  start: number;
  duration: number;
  onDone?: () => void;
}

/** 观看会话 UI 事件句柄（绑定/解绑共享，挂在被观看的 video 元素上） */
interface VideoHandlers {
  onMeta: () => void;
  onPlay: () => void;
  onPause: () => void;
  onTime: () => void;
  onPlaying: () => void;
  onEnded: () => void;
  /** 占位（实际失败处理由 slot 层 error handler 统一完成，此处仅为对称解绑） */
  onError: () => void;
  onVolume: () => void;
}

/** ambient 常驻视频运行时（每条有视频的条目一个） */
interface VideoSlotRuntime {
  /** 条目索引（= 胶卷格索引） */
  index: number;
  /** shader slot 下标（0..MAX_VIDEO_SLOTS-1，创建时分配） */
  slot: number;
  videoEl: HTMLVideoElement;
  tex: THREE.VideoTexture;
  /** 已起播（首帧淡入已触发） */
  started: boolean;
  /** 加载失败（已回退封面） */
  failed: boolean;
  /** 观看会话事件绑定中（有声观看） */
  watching: boolean;
  /** ambient 加载看门狗句柄 */
  loadTimer: number;
  /** 错峰启动延迟句柄（避免多路并发挤兑带宽） */
  playTimer: number;
}

/** Hook 选项 */
export interface UseFilmstripOptions {
  /**
   * 是否启用输入驱动与自动滚动（默认 true）。
   * WebGL 降级模式下置 false：Three 句柄不存在，交互由降级 UI 自管，
   * 避免键盘/点击双重响应与索引双源不同步。
   */
  inputEnabled?: boolean;
}

/** 开发环境调试钩子（Playwright 验证与人工验收用） */
export interface ReelDebugHook {
  getOffset(): number;
  getVelocity(): number;
  getState(): ReelState;
  getIndex(): number;
  /** 观看中的视频（无观看时返回首个 ambient 视频；完全无视频 null） */
  getVideo(): HTMLVideoElement | null;
  /** 全部 ambient 视频元素（滚动中多视频同播断言用） */
  getAmbientVideos(): HTMLVideoElement[];
  stepTo(targetIndex: number): void;
  nudge(dir: 1 | -1): void;
  /** 当前是否处于挂起状态（visibility / IO 触发） */
  isSuspended(): boolean;
  /** 测试用：手动触发挂起（模拟页面隐藏 / 滚出视口，document.hidden 无法伪造） */
  suspendForTest(): void;
  /** 测试用：手动恢复（清除全部挂起源） */
  resumeForTest(): void;
  /** 中央帧格在屏幕上的像素宽（触摸拖动换算基准；无场景时 0） */
  getFrameWidthPx(): number;
}

declare global {
  interface Window {
    __reel?: ReelDebugHook;
  }
}

// ------------------------------------------------------------
// 工具函数
// ------------------------------------------------------------

/** 强 ease-in-out 曲线（与项目 --ease-in-out token 一致，屏幕内移动规范） */
function easeInOutStrong(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 用户是否偏好减少动效（无 matchMedia 环境按 false 处理） */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MQ).matches ?? false;
}

/** 是否为移动布局（触屏主指针 或 视口窄于 768px） */
function isMobileLayout(): boolean {
  if (!window.matchMedia) return false;
  return window.matchMedia(COARSE_MQ).matches || window.matchMedia(NARROW_MQ).matches;
}

/** 循环取模到 [0, n) */
function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

/** 秒 → mm:ss（控制条时间显示，等宽数字由样式保证） */
function formatTime(sec: number): string {
  const v = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(v / 60);
  const s = Math.floor(v % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ------------------------------------------------------------
// Hook 实现
// ------------------------------------------------------------

/**
 * 胶卷交互状态机：自动滚动 + 悬停暂停 + 手动切换 + 触摸拖动 +
 * ambient 常驻视频循环播放 + 观看会话 + 挂起/恢复（Page Visibility /
 * IntersectionObserver）的统一协调。
 * @param items 精选作品列表（引用需稳定，如模块级常量）
 * @param options inputEnabled=false 时关闭全部输入与自动滚动（WebGL 降级模式用）
 */
export function useFilmstrip(items: ShowcaseItem[], options: UseFilmstripOptions = {}) {
  const total = items.length;
  const inputEnabled = options.inputEnabled ?? true;

  // —— 离散 UI 状态（低频 setState）——
  const [state, setState] = useState<ReelState>('auto');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [video, setVideo] = useState<VideoSessionState>(VIDEO_SESSION_IDLE);
  const [videoFailedIds, setVideoFailedIds] = useState<string[]>([]);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // —— 命令式高频状态（ref，不经 React）——
  const reelRef = useRef<FilmStripReelHandle | null>(null);
  const interactionRef = useRef<HTMLElement | null>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const stateRef = useRef<ReelState>('auto');
  const tweenRef = useRef<TweenTask | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isHoveredRef = useRef(false);
  const resumeAtRef = useRef(0); // resuming：恢复滚动时刻（performance.now 基）
  const cooldownUntilRef = useRef(0); // cooldown：到期时刻
  const anchorRef = useRef(0); // 索引锚点（滞回判定基准）
  const indexRef = useRef(0);
  const reducedMotionRef = useRef(false);
  /** 移动布局（触屏主指针或窄视口）：自动巡游关闭、触摸拖动启用 */
  const mobileLayoutRef = useRef(false);

  // —— 挂起（Page Visibility / IntersectionObserver 共用）——
  /** 是否处于挂起态（主 RAF / 渲染循环 / 视频全部暂停） */
  const suspendedRef = useRef(false);
  /** 各挂起源的独立计数（全部清除后才真正恢复） */
  const suspendSourcesRef = useRef<Set<SuspendSource>>(new Set());
  /** 挂起前观看视频是否在播放（恢复时续播依据） */
  const wasWatchPlayingRef = useRef(false);

  // —— 触摸拖动会话 ——
  const dragRef = useRef<DragSession | null>(null);

  // —— 视频运行时（ambient 常驻多 slot + 观看会话）——
  /** ambient 常驻视频列表（每条有 videoUrl 的条目一个，创建于 startAmbient） */
  const slotsRef = useRef<VideoSlotRuntime[]>([]);
  /** ambient 巡检自愈定时器（startAmbient 创建，卸载清理） */
  const healTimerRef = useRef(0);
  /** 观看会话条目索引（null = 无观看，全部静音 ambient） */
  const watchIndexRef = useRef<number | null>(null);
  /** 观看会话 UI 事件句柄（挂在被观看的 video 元素上） */
  const watchHandlersRef = useRef<VideoHandlers | null>(null);
  const failedIdsRef = useRef<Set<string>>(new Set());
  const noticeTimerRef = useRef(0);

  // —— 挂起/恢复函数引用（主 RAF effect 内定义，供外部 effect 与 DEV 钩子调用）——
  const suspendFnRef = useRef<((source: SuspendSource) => void) | null>(null);
  const resumeFnRef = useRef<((source: SuspendSource) => void) | null>(null);

  /** 双写状态（ref 供 RAF/事件闭包读取，state 供 UI 渲染） */
  const setReelState = useCallback((s: ReelState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  /** 自动巡游是否允许：非移动布局 且 未偏好减少动效 */
  const autoScrollAllowed = useCallback(
    () => !reducedMotionRef.current && !mobileLayoutRef.current,
    []
  );

  /** 清空 pending 的计时（resume / cooldown） */
  const clearPendingTimers = useCallback(() => {
    resumeAtRef.current = 0;
    cooldownUntilRef.current = 0;
  }, []);

  /** 展示行内提示（自动消失） */
  const showNotice = useCallback((text: string) => {
    setVideoNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setVideoNotice(null), NOTICE_TIMEOUT_MS);
  }, []);

  /**
   * 结束观看会话：解绑 UI 事件、静音回 ambient 循环、解锁状态机。
   * @param reason ended=自然播完（loop 下不触发，防御保留）；switch=切换
   *        作品/手动操作接管；failed=观看中视频加载失败
   */
  const endWatchSession = useCallback(
    (_reason: 'ended' | 'switch' | 'failed') => {
      const idx = watchIndexRef.current;
      if (idx == null) return;
      watchIndexRef.current = null;
      const rt = slotsRef.current.find((s) => s.index === idx);
      setVideo(VIDEO_SESSION_IDLE);
      if (rt) {
        const handlers = watchHandlersRef.current;
        if (handlers) {
          rt.videoEl.removeEventListener('loadedmetadata', handlers.onMeta);
          rt.videoEl.removeEventListener('play', handlers.onPlay);
          rt.videoEl.removeEventListener('pause', handlers.onPause);
          rt.videoEl.removeEventListener('timeupdate', handlers.onTime);
          rt.videoEl.removeEventListener('playing', handlers.onPlaying);
          rt.videoEl.removeEventListener('ended', handlers.onEnded);
          rt.videoEl.removeEventListener('error', handlers.onError);
          rt.videoEl.removeEventListener('volumechange', handlers.onVolume);
          watchHandlersRef.current = null;
        }
        rt.watching = false;
        // 回 ambient：静音继续循环（进度保留在元素内，画面连续无跳变）
        rt.videoEl.muted = true;
      }
      // 观看锁定解除 → 依鼠标位置恢复（switch 路径状态由调用方接管覆盖）
      if (stateRef.current === 'playing') {
        clearPendingTimers();
        if (isHoveredRef.current) {
          setReelState('hover');
        } else {
          setReelState('cooldown');
          cooldownUntilRef.current = performance.now() + MANUAL_COOLDOWN_MS;
        }
      }
    },
    [clearPendingTimers, setReelState]
  );

  /**
   * 启动 ambient 常驻视频：为全部有视频的条目（上限 MAX_VIDEO_SLOTS）
   * 创建静音循环 video + VideoTexture slot，接入 shader —— 不进入任何
   * 状态机状态，自动巡游滚动照常进行，所有视频格同时循环播放。
   * 由父组件在胶卷 layout 就绪后调用一次；幂等（已创建则跳过）。
   */
  const startAmbient = useCallback(() => {
    const reel = reelRef.current;
    if (!reel || slotsRef.current.length > 0) return;

    const list: VideoSlotRuntime[] = [];
    items.forEach((item, index) => {
      if (!item.videoUrl || failedIdsRef.current.has(item.id)) return;
      if (list.length >= MAX_VIDEO_SLOTS) return;
      const slot = list.length;

      const videoEl = document.createElement('video');
      videoEl.crossOrigin = 'anonymous';
      // metadata：起播后按播放码率渐进拉流，避免多路 preload=auto 全量
      // 缓冲挤兑带宽（实测并发全量拉流会集体 stalled 互相拖死）
      videoEl.preload = 'metadata';
      videoEl.playsInline = true;
      videoEl.muted = true; // ambient：静音（满足自动播放策略）
      videoEl.loop = true; // 一直循环播放

      const tex = new THREE.VideoTexture(videoEl);
      tex.minFilter = THREE.LinearFilter;

      const rt: VideoSlotRuntime = {
        index,
        slot,
        videoEl,
        tex,
        started: false,
        failed: false,
        watching: false,
        loadTimer: 0,
        playTimer: 0,
      };

      // metadata → contain 子矩形：视频宽高比 ≠ 画面区（≈16:9）时 letterbox 留黑
      videoEl.addEventListener('loadedmetadata', () => {
        const vw = videoEl.videoWidth || 16;
        const vh = videoEl.videoHeight || 9;
        const frameAspect = reel.getFrameAspect();
        if (vw / vh >= frameAspect) {
          const shownH = frameAspect / (vw / vh);
          reel.setVideoSlotUVRect(slot, 0, (1 - shownH) / 2, 1, (1 + shownH) / 2);
        } else {
          const shownW = (vw / vh) / frameAspect;
          reel.setVideoSlotUVRect(slot, (1 - shownW) / 2, 0, (1 + shownW) / 2, 1);
        }
      });

      // 首次起播 → 淡入（持续重绘由组件内 videoTexActive 机制驱动）
      videoEl.addEventListener('playing', () => {
        if (rt.started) return;
        rt.started = true;
        window.clearTimeout(rt.loadTimer);
        reel.setVideoSlotVisible(slot, true);
      });

      // 失败 → 静默回退封面（观看中失败额外结束会话 + 提示）
      videoEl.addEventListener('error', () => {
        if (rt.failed) return; // 幂等（error 可能连发）
        rt.failed = true;
        failedIdsRef.current.add(item.id);
        setVideoFailedIds([...failedIdsRef.current]);
        window.clearTimeout(rt.loadTimer);
        window.clearTimeout(rt.playTimer);
        reel.setVideoSlot(slot, null, index);
        videoEl.pause();
        if (rt.watching) {
          endWatchSession('failed');
          showNotice('视频加载失败，已保留封面');
        }
      });


      reel.setVideoSlot(slot, tex, index);
      reel.setVideoSlotVisible(slot, false);

      // 错峰启动：逐路延迟拉流（首个立即），避免多路并发挤兑带宽导致
      // 集体 stalled —— 画面逐格亮起，观感上亦更柔和
      const startDelay = slot * AMBIENT_STAGGER_MS;
      rt.playTimer = window.setTimeout(() => {
        rt.playTimer = 0;
        videoEl.src = item.videoUrl;
        // 静音自动播放正常可行；AbortError（竞态）由事件同步，其余看门狗兜底
        videoEl.play().catch(() => {});
      }, startDelay);

      // 看门狗：超时仍无起播进展（未起播且无任何缓冲数据）按失败处理；
      // readyState ≥ 2 或 currentTime > 0 视为「有进展」，宽限到起播为止
      rt.loadTimer = window.setTimeout(() => {
        if (
          !rt.started &&
          !rt.failed &&
          videoEl.readyState < 2 &&
          videoEl.currentTime === 0
        ) {
          videoEl.dispatchEvent(new Event('error'));
        }
      }, VIDEO_LOAD_TIMEOUT_MS + startDelay);
      list.push(rt);
    });
    slotsRef.current = list;

    // 巡检自愈：慢网络下 play() 可能静默失败（promise reject 且无 pause
    // 事件），视频也会被浏览器策略回收/断流暂停 —— 周期性重试续播，
    // 保持 ambient 常驻循环（观看/挂起/失败态不干预）
    if (list.length > 0) {
      healTimerRef.current = window.setInterval(() => {
        if (suspendedRef.current) return;
        slotsRef.current.forEach((s) => {
          if (!s.watching && !s.failed && s.videoEl.paused) {
            s.videoEl.play().catch(() => {});
          }
        });
      }, 3000);
    }
  }, [endWatchSession, items, showNotice]);

  /** 启动 tween（覆盖进行中的动画，丢弃其 onDone） */
  const startTween = useCallback(
    (target: number, durationMs: number, onDone?: () => void) => {
      const from = offsetRef.current;
      // reduced-motion 或零距离：直接跳变并立即完成
      if (reducedMotionRef.current || Math.abs(target - from) < 1e-4) {
        offsetRef.current = target;
        velocityRef.current = 0;
        tweenRef.current = null;
        onDone?.();
        return;
      }
      tweenRef.current = { from, to: target, start: performance.now(), duration: durationMs, onDone };
    },
    []
  );

  /**
   * 进入观看会话：接管该条目已常驻的 ambient video 元素 —— 解除静音、
   * 绑定控制条 UI 事件、锁定状态机（playing，滚动停止）。
   * 调用前提：目标格已居中（|offset - target| < 0.01）。
   */
  const beginWatch = useCallback(
    (index: number) => {
      const rt = slotsRef.current.find((s) => s.index === index && !s.failed);
      if (!rt) return;

      // —— 状态机进入观看锁定 ——
      setReelState('playing');
      velocityRef.current = 0;
      tweenRef.current = null;
      clearPendingTimers();
      watchIndexRef.current = index;
      rt.watching = true;

      // 错峰启动未到（src 尚未设置）：观看优先，立即开始拉流
      if (!rt.videoEl.currentSrc) {
        window.clearTimeout(rt.playTimer);
        rt.playTimer = 0;
        rt.videoEl.src = items[index].videoUrl;
      }

      const { videoEl } = rt;
      const handlers: VideoHandlers = {
        onMeta: () => setVideo((u) => ({ ...u, duration: videoEl.duration || 0 })),
        onPlay: () => setVideo((u) => (u.playing ? u : { ...u, playing: true })),
        onPause: () => setVideo((u) => (u.playing ? { ...u, playing: false } : u)),
        onTime: () => setVideo((u) => ({ ...u, currentTime: videoEl.currentTime })),
        onPlaying: () => setVideo((u) => (u.loading ? { ...u, loading: false } : u)),
        onEnded: () => endWatchSession('ended'), // loop 下不触发，防御保留
        onError: () => {
          /* slot 层 error handler 统一处理（含观看提示与会话结束） */
        },
        onVolume: () =>
          setVideo((u) => (u.muted === videoEl.muted ? u : { ...u, muted: videoEl.muted })),
      };
      watchHandlersRef.current = handlers;
      videoEl.addEventListener('loadedmetadata', handlers.onMeta);
      videoEl.addEventListener('play', handlers.onPlay);
      videoEl.addEventListener('pause', handlers.onPause);
      videoEl.addEventListener('timeupdate', handlers.onTime);
      videoEl.addEventListener('playing', handlers.onPlaying);
      videoEl.addEventListener('ended', handlers.onEnded);
      videoEl.addEventListener('error', handlers.onError);
      videoEl.addEventListener('volumechange', handlers.onVolume);

      // 手势链路内解除静音（有声观看；画面连续，进度不跳变）
      videoEl.muted = false;
      setVideo({
        active: true,
        playing: !videoEl.paused,
        muted: false,
        currentTime: videoEl.currentTime,
        duration: videoEl.duration || 0,
        loading: videoEl.readyState < 3,
      });
      videoEl.play().catch((err: unknown) => {
        const name = err instanceof Error ? err.name : '';
        // 自动播放策略拦截 → 静音重试；AbortError（连续切换的竞态）→ 静默
        if (name === 'NotAllowedError') {
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        }
      });
    },
    [clearPendingTimers, endWatchSession, items, setReelState]
  );

  /** 手动切换的统一路径：tween 居中（720ms 强 ease-in-out）→ 5s 冷却 */
  const manualStepTo = useCallback(
    (targetIndex: number) => {
      // 切换作品前结束观看（视频回 ambient 静音循环）
      if (watchIndexRef.current != null) endWatchSession('switch');
      // 目标取与当前位置最近的同余代表（循环最短路径）
      const cur = offsetRef.current;
      const target = targetIndex + total * Math.round((cur - targetIndex) / total);
      setReelState('manual');
      clearPendingTimers();
      startTween(target, MANUAL_TWEEN_MS, () => {
        if (stateRef.current !== 'playing') {
          setReelState('cooldown');
          cooldownUntilRef.current = performance.now() + MANUAL_COOLDOWN_MS;
        }
      });
    },
    [clearPendingTimers, endWatchSession, setReelState, startTween, total]
  );

  /** 相对步进：dir=1 下一格（内容左移），dir=-1 上一格 */
  const nudge = useCallback(
    (dir: 1 | -1) => {
      // 基于当前 tween 目标累加：快速连点时目标连续推进（不拉锯）；
      // 无动画进行时取最近整数格
      const base = tweenRef.current ? tweenRef.current.to : Math.round(offsetRef.current);
      manualStepTo(mod(base + dir, total));
    },
    [manualStepTo, total]
  );

  /** 绝对跳转：居中目标索引（循环最短路径，600-800ms） */
  const stepTo = useCallback(
    (targetIndex: number) => {
      manualStepTo(mod(targetIndex, total));
    },
    [manualStepTo, total]
  );

  /** 观看会话内的视频元素（无观看时 null） */
  const watchVideoEl = useCallback(() => {
    const idx = watchIndexRef.current;
    if (idx == null) return null;
    return slotsRef.current.find((s) => s.index === idx)?.videoEl ?? null;
  }, []);

  /** 播放/暂停切换（观看会话内） */
  const togglePlayPause = useCallback(() => {
    const v = watchVideoEl();
    if (!v) return;
    if (v.paused) {
      v.play().catch((err: unknown) => {
        const name = err instanceof Error ? err.name : '';
        // 自动播放策略拦截 → 静音重试；AbortError（连续切换的竞态）→ 静默
        if (name === 'NotAllowedError') {
          v.muted = true;
          v.play().catch(() => {});
        }
      });
    } else {
      v.pause();
    }
  }, [watchVideoEl]);

  /**
   * 播放当前作品（点击画面中央/空格）。
   * 有视频：先居中（400ms）再有声观看（复用 ambient 元素）；无视频或已
   * 失败：跳转原站观看。
   */
  const playCurrent = useCallback(() => {
    const index = indexRef.current;
    const item = items[index];
    if (!item) return;
    if (!item.videoUrl || failedIdsRef.current.has(item.id)) {
      window.open(item.watchUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // 已是该作品的观看会话 → 切换播放/暂停
    if (watchIndexRef.current === index) {
      togglePlayPause();
      return;
    }
    // 换作品：先结束旧观看（视频回 ambient）
    if (watchIndexRef.current != null) endWatchSession('switch');
    // 未完全居中 → 先 tween 居中（400ms），到位后开始观看
    const cur = offsetRef.current;
    const target = index + total * Math.round((cur - index) / total);
    if (Math.abs(cur - target) > 0.01) {
      setReelState('manual');
      clearPendingTimers();
      startTween(target, CENTER_TWEEN_MS, () => beginWatch(index));
    } else {
      beginWatch(index);
    }
  }, [
    beginWatch,
    clearPendingTimers,
    endWatchSession,
    items,
    setReelState,
    startTween,
    togglePlayPause,
    total,
  ]);

  /** 静音切换 */
  const toggleMute = useCallback(() => {
    const v = watchVideoEl();
    if (!v) return;
    v.muted = !v.muted; // UI 状态经 volumechange 事件同步
  }, [watchVideoEl]);

  /** 进度跳转（秒） */
  const seek = useCallback((time: number) => {
    const v = watchVideoEl();
    if (!v || !Number.isFinite(time) || time < 0) return;
    v.currentTime = Math.min(time, v.duration || time);
    setVideo((u) => ({ ...u, currentTime: v.currentTime }));
  }, [watchVideoEl]);

  /** 全屏切换（胶卷区域容器，WebGL canvas 内的视频画面一并全屏） */
  const toggleFullscreen = useCallback(() => {
    const el = interactionRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      // exitFullscreen 在全屏状态竞态下可能 reject（如刚被 ESC 退出），
      // 静默处理避免 unhandled rejection
      document.exitFullscreen().catch(() => {});
    } else {
      // requestFullscreen 在无用户激活 / 被浏览器策略拦截时会 reject
      // （如非手势链路调用），同样静默处理
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  /** 关闭行内提示 */
  const dismissNotice = useCallback(() => {
    window.clearTimeout(noticeTimerRef.current);
    setVideoNotice(null);
  }, []);

  // ------------------------------------------------------------
  // 初始状态对齐：移动布局 / reduced-motion → 自动巡游关闭（初始即停）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!inputEnabled) return;
    reducedMotionRef.current = prefersReducedMotion();
    mobileLayoutRef.current = isMobileLayout();
    // 减少动效偏好 / 移动布局：不自动巡游（无限循环运动降级），等待手动交互。
    // cooldownUntil = 0 表示永久静止（到期判定读 autoScrollAllowed 不会回 auto）
    if ((reducedMotionRef.current || mobileLayoutRef.current) && stateRef.current === 'auto') {
      setReelState('cooldown');
      cooldownUntilRef.current = 0;
    }
  }, [inputEnabled, setReelState]);

  // ------------------------------------------------------------
  // RAF 主循环：唯一驱动源（tween / 速度 / 状态到期 / uniform 同步）
  // + 挂起/恢复（suspend/resume 供 visibility / IO / 测试钩子共用）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!inputEnabled) return;

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      // dt 双向 clamp：上界防后台标签页回来时跳变；下界防 rAF 时间戳与
      // performance.now() 的时钟源偏差（个别浏览器首帧可能出现负差，
      // 负 dt 会让速度插值反向发散 —— 该帧直接跳过，位置不动）
      const dt = Math.max(0, Math.min((now - lastTimeRef.current) / 1000, 0.1));
      lastTimeRef.current = now;

      // 1) tween 驱动（手动切换/居中/拖动松手动画独占写 offset）
      const tw = tweenRef.current;
      if (tw) {
        const t = Math.min(1, (now - tw.start) / tw.duration);
        offsetRef.current = tw.from + (tw.to - tw.from) * easeInOutStrong(t);
        velocityRef.current = 0;
        if (t >= 1) {
          tweenRef.current = null;
          tw.onDone?.();
        }
      } else if (stateRef.current !== 'playing' && stateRef.current !== 'drag' && dt > 0) {
        // 2) 速度驱动：目标速度由状态决定，指数逼近实现柔和加减速
        //    （drag 状态下 offset 由 touchmove 直接写入，速度分支跳过）
        const target = stateRef.current === 'auto' ? FULL_SPEED : 0;
        if (velocityRef.current !== target) {
          const tau = target > velocityRef.current ? START_TAU : STOP_TAU;
          velocityRef.current += (target - velocityRef.current) * (1 - Math.exp(-dt / tau));
          if (Math.abs(velocityRef.current) < VELOCITY_EPSILON) velocityRef.current = 0;
          else if (Math.abs(target - velocityRef.current) < VELOCITY_EPSILON) {
            velocityRef.current = target;
          }
          // 数值保险：速度物理上只应处于 [0, FULL_SPEED] 的收敛路径上，
          // 任何超出合理倍数的值视为异常（时钟毛刺等）直接归零
          if (Math.abs(velocityRef.current) > FULL_SPEED * 50) velocityRef.current = 0;
        }
        if (velocityRef.current !== 0) offsetRef.current += velocityRef.current * dt;
      }

      // 3) 时间驱动的状态转换（resuming 到期恢复 / cooldown 到期判定）
      const s = stateRef.current;
      if (s === 'resuming' && resumeAtRef.current !== 0 && now >= resumeAtRef.current) {
        resumeAtRef.current = 0;
        if (autoScrollAllowed() && !isHoveredRef.current) setReelState('auto');
      } else if (
        s === 'cooldown' &&
        cooldownUntilRef.current !== 0 &&
        now >= cooldownUntilRef.current
      ) {
        cooldownUntilRef.current = 0;
        // 到期恢复条件：鼠标不在交互区（观看中不会进 cooldown）
        if (isHoveredRef.current) setReelState('hover');
        else if (autoScrollAllowed()) setReelState('auto');
      }

      // 4) uniform 同步（命令式；视频格判定在 shader 内按同余代表连续完成）
      reelRef.current?.setOffset(offsetRef.current);

      // 5) 当前项检测（round ± 滞回，避免边界闪动；离散 setState）
      if (Math.abs(offsetRef.current - anchorRef.current) >= INDEX_HYSTERESIS) {
        anchorRef.current = Math.round(offsetRef.current);
        const idx = mod(anchorRef.current, total);
        if (idx !== indexRef.current) {
          indexRef.current = idx;
          setCurrentIndex(idx);
          // 防御：索引变化即用户视点已离开当前视频 → 结束观看会话
          // （正常流程手动/观看路径已先行结束，此处仅兜底）
          if (watchIndexRef.current != null) endWatchSession('switch');
        }
      }
    };

    // —— 挂起：停主循环 / Three 渲染循环 / 全部视频播放（多源计数幂等）——
    const suspend = (source: SuspendSource) => {
      if (suspendedRef.current) {
        suspendSourcesRef.current.add(source);
        return;
      }
      suspendedRef.current = true;
      suspendSourcesRef.current.add(source);
      // 记录观看视频播放态并暂停全部视频（ambient + 观看）
      const watchRt = slotsRef.current.find((s) => s.index === watchIndexRef.current);
      wasWatchPlayingRef.current = !!watchRt && !watchRt.videoEl.paused;
      slotsRef.current.forEach((s) => s.videoEl.pause());
      // 进行中的拖动按取消处理（页面切走时触摸序列已被系统中断）
      dragRef.current = null;
      // 进行中的 tween 直接就位：恢复时无时间跳变（不调 onDone，状态由 resume 重决策）
      const tw = tweenRef.current;
      if (tw) {
        offsetRef.current = tw.to;
        tweenRef.current = null;
      }
      // 停主 RAF 循环（最后一帧已排的回调取消）
      cancelAnimationFrame(rafRef.current);
      // 停 Three 渲染循环（离屏/后台零绘制，省电）
      reelRef.current?.setRenderingEnabled(false);
    };

    // —— 恢复：全部挂起源清除后重启，并按当前交互状态重决策 ——
    const resume = (source: SuspendSource) => {
      suspendSourcesRef.current.delete(source);
      if (suspendSourcesRef.current.size > 0) return; // 还有其他挂起源
      if (!suspendedRef.current) return;
      suspendedRef.current = false;
      // 视频恢复：ambient 全部续播（静音自动播放）；观看视频按挂起前
      // 播放态恢复（用户手势链路已成立，被拦截时静默放弃保留暂停态）
      slotsRef.current.forEach((s) => {
        if (s.index === watchIndexRef.current && !wasWatchPlayingRef.current) return;
        s.videoEl.play().catch(() => {});
      });
      // 状态重决策（挂起期间指针状态可能已变化）：
      //   playing 保持（观看视频按上面的续播策略处理）；
      //   拖动/动画中 → 静止冷却；鼠标在区内 → 悬停停；
      //   其余按自动巡游许可决定（移动端/reduced-motion 保持冷却）
      const s = stateRef.current;
      if (s !== 'playing' && s !== 'cooldown' && s !== 'resuming') {
        if (isHoveredRef.current) setReelState('hover');
        else if (autoScrollAllowed()) setReelState('auto');
        else setReelState('cooldown');
      }
      // 速度归零后经 START_TAU 平滑升速（挂起可能很久，旧速度语义已过时）
      velocityRef.current = 0;
      // 重启主循环与渲染循环（时间基准重置，dt 从 0 起算）
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
      reelRef.current?.setRenderingEnabled(true);
    };

    suspendFnRef.current = suspend;
    resumeFnRef.current = resume;

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      suspendFnRef.current = null;
      resumeFnRef.current = null;
    };
  }, [
    autoScrollAllowed,
    endWatchSession,
    inputEnabled,
    setReelState,
    total,
  ]);

  // ------------------------------------------------------------
  // 媒体查询监听：移动布局（coarse/narrow）与 prefers-reduced-motion 变化
  // ------------------------------------------------------------
  useEffect(() => {
    if (!inputEnabled || !window.matchMedia) return;
    const coarseMq = window.matchMedia(COARSE_MQ);
    const narrowMq = window.matchMedia(NARROW_MQ);
    const reducedMq = window.matchMedia(REDUCED_MQ);

    /** 移动布局切换：切入即停巡游；切回桌面延迟 1s 恢复（若允许） */
    const syncMobile = () => {
      const prev = mobileLayoutRef.current;
      const next = coarseMq.matches || narrowMq.matches;
      mobileLayoutRef.current = next;
      if (next && !prev) {
        // 切入移动布局（转竖屏/接触屏）：立即停巡游（速度经 STOP_TAU 柔停）
        const s = stateRef.current;
        if (s === 'auto' || s === 'resuming') {
          clearPendingTimers();
          setReelState('cooldown');
          cooldownUntilRef.current = 0; // 永久静止（移动端不自动巡游）
        }
      } else if (!next && prev) {
        // 切回桌面布局：无 pending 冷却且允许巡游 → 延迟 1s 柔和恢复
        if (
          stateRef.current === 'cooldown' &&
          cooldownUntilRef.current === 0 &&
          !reducedMotionRef.current
        ) {
          setReelState('resuming');
          resumeAtRef.current = performance.now() + HOVER_RESUME_DELAY_MS;
        }
      }
    };

    /** reduced-motion 切换：开启即停巡游；关闭保守不主动恢复（等交互/到期判定） */
    const syncReduced = () => {
      reducedMotionRef.current = reducedMq.matches;
      if (reducedMotionRef.current) {
        const s = stateRef.current;
        if (s === 'auto' || s === 'resuming') {
          clearPendingTimers();
          setReelState('cooldown');
          cooldownUntilRef.current = 0; // 永久静止
        }
      }
    };

    syncMobile(); // 挂载即对齐（幂等：初始 effect 已设初值）
    syncReduced();
    coarseMq.addEventListener('change', syncMobile);
    narrowMq.addEventListener('change', syncMobile);
    reducedMq.addEventListener('change', syncReduced);
    return () => {
      coarseMq.removeEventListener('change', syncMobile);
      narrowMq.removeEventListener('change', syncMobile);
      reducedMq.removeEventListener('change', syncReduced);
    };
  }, [clearPendingTimers, inputEnabled, setReelState]);

  // ------------------------------------------------------------
  // 触摸拖动（移动端）：跟手 → 松手 snap / 回弹
  // ------------------------------------------------------------
  useEffect(() => {
    const main = interactionRef.current;
    if (!main || !inputEnabled) return;

    /** 触点查询（changedTouches 中按 identifier 找主触点） */
    const findTouch = (e: TouchEvent): Touch | null => {
      const d = dragRef.current;
      if (!d) return null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === d.identifier) return t;
      }
      return null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return; // 多指不拖（缩放等交给默认）
      // 落点在控件上（箭头/播放按钮/控制条/链接）→ 交还控件自身处理
      if (e.target instanceof Element && e.target.closest('button, a, input, video')) {
        dragRef.current = null;
        return;
      }
      const t = e.touches[0];
      dragRef.current = {
        identifier: t.identifier,
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastT: performance.now(),
        startOffset: offsetRef.current,
        cellPx: 0,
        axis: null,
        active: false,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const t = findTouch(e);
      if (!t) return;

      const dx = t.clientX - d.startX;
      const dy = t.clientY - d.startY;

      // —— 主轴判定（一次）：超过阈值后锁定方向 ——
      if (d.axis === null) {
        if (Math.abs(dx) < TOUCH_AXIS_THRESHOLD && Math.abs(dy) < TOUCH_AXIS_THRESHOLD) return;
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (d.axis !== 'x') {
          // 纵向滑动：放弃本次手势（页面无滚动，交还默认行为）
          dragRef.current = null;
          return;
        }
        // 锁定横向拖动：接管状态机（结束观看会话、取消动画、速度清零）
        d.active = true;
        const cellPx = reelRef.current?.getFrameWidthPx() || main.clientWidth * 0.8;
        d.cellPx = Math.max(1, cellPx);
        if (watchIndexRef.current != null) endWatchSession('switch');
        velocityRef.current = 0;
        tweenRef.current = null;
        clearPendingTimers();
        setReelState('drag');
      }
      if (!d.active) return;

      // 阻止页面默认滚动/回弹（配合 main 的 touch-action: none；此时
      // 位移已超阈值，不会吞掉点击 —— 点击场景的轻微抖动不进入此分支）
      e.preventDefault();

      // 实时跟手：手指左移（dx<0）→ 内容左移 → offset 增加。
      // 直接写 uniform（不等 RAF，跟手延迟最低）；索引滞回检测仍由主循环做
      offsetRef.current = d.startOffset - dx / d.cellPx;
      reelRef.current?.setOffset(offsetRef.current);

      d.lastX = t.clientX;
      d.lastT = performance.now();
    };

    /**
     * 松手/中断收尾：按位移与速度判定 snap 目标。
     * @param cancelled touchcancel（系统打断）：不做 fling 判定，按位移回弹/吸附
     */
    const finishDrag = (e: TouchEvent, cancelled: boolean) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !d.active) return; // 未进入拖动（点击/纵向）→ click 自然触发

      const t = findTouch(e);
      const now = performance.now();
      // 末段速度（px/ms）：正 = 手指向右（内容右移/上一格方向）
      const dt = Math.max(1, now - d.lastT);
      const vx = t ? (t.clientX - d.lastX) / dt : 0;

      const startCell = Math.round(d.startOffset);
      const moved = offsetRef.current - d.startOffset; // 正 = 向下一格
      const absMoved = Math.abs(moved);
      // fling：末段速度足够快（约 450px/s）；速度方向优先于位移方向（回甩场景）
      const fling = !cancelled && Math.abs(vx) > TOUCH_FLING_VELOCITY;
      const dir = fling
        ? vx < 0
          ? 1
          : -1
        : moved > 0
          ? 1
          : moved < 0
            ? -1
            : 0;

      // 目标格：位移达阈值（格宽 15%）或 fling → 至少进一格（大幅拖动按距离进多格）；
      // 否则回弹当前格（350ms）
      let target = startCell;
      if (dir !== 0 && (absMoved >= TOUCH_DRAG_THRESHOLD || fling)) {
        target = startCell + dir * Math.max(1, Math.round(absMoved));
      }

      const dist = Math.abs(target - offsetRef.current);
      if (dist < 1e-4) {
        // 无位移（罕见）：直接进入冷却
        setReelState('cooldown');
        cooldownUntilRef.current = performance.now() + MANUAL_COOLDOWN_MS;
        return;
      }
      // snap 到相邻格：600-800ms ease-in-out-strong；回弹当前格：350ms
      setReelState('manual');
      startTween(target, target === startCell ? SNAP_BACK_MS : MANUAL_TWEEN_MS, () => {
        // 归一化控幅（长时间使用的连续增长收敛回 [0, total)）
        offsetRef.current = mod(offsetRef.current, total);
        anchorRef.current = Math.round(offsetRef.current);
        if (stateRef.current !== 'playing') {
          setReelState('cooldown');
          cooldownUntilRef.current = performance.now() + MANUAL_COOLDOWN_MS;
        }
      });
    };

    const onTouchEnd = (e: TouchEvent) => finishDrag(e, false);
    const onTouchCancel = (e: TouchEvent) => finishDrag(e, true);

    main.addEventListener('touchstart', onTouchStart, { passive: true });
    // touchmove 需 preventDefault 阻止默认滚动 → 显式 non-passive
    main.addEventListener('touchmove', onTouchMove, { passive: false });
    main.addEventListener('touchend', onTouchEnd, { passive: true });
    main.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      main.removeEventListener('touchstart', onTouchStart);
      main.removeEventListener('touchmove', onTouchMove);
      main.removeEventListener('touchend', onTouchEnd);
      main.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [clearPendingTimers, endWatchSession, inputEnabled, setReelState, startTween]);

  // ------------------------------------------------------------
  // 交互区 pointer 事件（mouseenter/leave 语义，仅响应鼠标）
  // ------------------------------------------------------------
  useEffect(() => {
    const main = interactionRef.current;
    if (!main || !inputEnabled) return;

    const onPointerEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return; // 触屏点击不构成「悬停」
      isHoveredRef.current = true;
      const s = stateRef.current;
      if (s === 'auto' || s === 'resuming' || s === 'cooldown') {
        clearPendingTimers();
        setReelState('hover'); // 速度将在约 150ms 内柔和衰减到 0
      }
    };
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      isHoveredRef.current = false;
      if (stateRef.current === 'hover') {
        setReelState('resuming'); // 等 1s 后平滑恢复（位置连续）
        resumeAtRef.current = performance.now() + HOVER_RESUME_DELAY_MS;
      }
    };

    main.addEventListener('pointerenter', onPointerEnter);
    main.addEventListener('pointerleave', onPointerLeave);
    return () => {
      main.removeEventListener('pointerenter', onPointerEnter);
      main.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [clearPendingTimers, inputEnabled, setReelState]);

  // ------------------------------------------------------------
  // 键盘支持（←/→ 切换、空格 播放/暂停、ESC 暂停切换）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!inputEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // 输入控件场景不劫持（首页当前无输入框，防御性保留）
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          nudge(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nudge(1);
          break;
        case ' ':
          e.preventDefault();
          if (watchIndexRef.current != null) togglePlayPause();
          else playCurrent();
          break;
        case 'Escape':
          // 全屏时交给浏览器默认退出全屏；观看中切换暂停
          if (document.fullscreenElement) return;
          if (watchIndexRef.current != null) togglePlayPause();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputEnabled, nudge, playCurrent, togglePlayPause]);

  // ------------------------------------------------------------
  // Page Visibility：页面隐藏时挂起（滚动/渲染/视频），回来恢复
  // ------------------------------------------------------------
  useEffect(() => {
    if (!inputEnabled) return;
    const onVisibilityChange = () => {
      if (document.hidden) suspendFnRef.current?.('visibility');
      else resumeFnRef.current?.('visibility');
    };
    // 挂载时页面即处于隐藏态（如后台标签页直接打开）→ 主动挂起
    if (document.hidden) suspendFnRef.current?.('visibility');
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [inputEnabled]);

  // ------------------------------------------------------------
  // IntersectionObserver：胶卷滚出可视区域时挂起（回来自动恢复）
  // ------------------------------------------------------------
  useEffect(() => {
    const main = interactionRef.current;
    if (!main || !inputEnabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) resumeFnRef.current?.('intersection');
        else suspendFnRef.current?.('intersection');
      },
      { threshold: 0 }
    );
    observer.observe(main);
    return () => observer.disconnect();
  }, [inputEnabled]);

  // ------------------------------------------------------------
  // 全屏状态跟踪
  // ------------------------------------------------------------
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ------------------------------------------------------------
  // 卸载清理：停 RAF / 计时器 / 全部视频与纹理（StrictMode 双挂载安全）
  // ------------------------------------------------------------
  useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimerRef.current);
      // 停巡检自愈
      window.clearInterval(healTimerRef.current);
      healTimerRef.current = 0;
      // 全部 ambient/观看视频立即清理（含看门狗与错峰启动计时器）
      slotsRef.current.forEach((s) => {
        window.clearTimeout(s.loadTimer);
        window.clearTimeout(s.playTimer);
        s.videoEl.pause();
        s.videoEl.removeAttribute('src');
        s.videoEl.load(); // 中断缓冲，释放网络资源
        s.tex.dispose();
      });
      slotsRef.current = [];
      watchIndexRef.current = null;
      watchHandlersRef.current = null;
      dragRef.current = null;
    };
  }, []);

  // ------------------------------------------------------------
  // 开发环境调试钩子（测试断言与人工验收用）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const hook: ReelDebugHook = {
      getOffset: () => offsetRef.current,
      getVelocity: () => velocityRef.current,
      getState: () => stateRef.current,
      getIndex: () => indexRef.current,
      getVideo: () => {
        const watch = slotsRef.current.find((s) => s.index === watchIndexRef.current);
        return (watch ?? slotsRef.current[0])?.videoEl ?? null;
      },
      getAmbientVideos: () => slotsRef.current.map((s) => s.videoEl),
      stepTo: (targetIndex: number) => stepTo(targetIndex),
      nudge: (dir: 1 | -1) => nudge(dir),
      isSuspended: () => suspendedRef.current,
      suspendForTest: () => suspendFnRef.current?.('visibility'),
      resumeForTest: () => {
        // 测试恢复：清除全部挂起源（等价于页面重新可见 + 重新进入视口）
        suspendSourcesRef.current.clear();
        resumeFnRef.current?.('visibility');
      },
      getFrameWidthPx: () => reelRef.current?.getFrameWidthPx() ?? 0,
    };
    window.__reel = hook;
    return () => {
      if (window.__reel === hook) delete window.__reel;
    };
  }, [nudge, stepTo]);

  return {
    // refs
    reelRef: reelRef as RefObject<FilmStripReelHandle>,
    interactionRef: interactionRef as RefObject<HTMLElement>,
    // 离散状态
    state,
    currentIndex,
    video,
    videoFailedIds,
    videoNotice,
    isFullscreen,
    // 动作
    nudge,
    stepTo,
    playCurrent,
    startAmbient,
    togglePlayPause,
    toggleMute,
    seek,
    toggleFullscreen,
    dismissNotice,
    // 工具
    formatTime,
  };
}