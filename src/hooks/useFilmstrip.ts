import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { RefObject } from 'react';
import { MAX_VIDEO_SLOTS, type FilmStripReelHandle } from '@/components/filmstrip/FilmStripReel';
import type { ShowcaseItem } from '@/data/showcase';
import { SCROLL_SECONDS_PER_FRAME } from '@/data/showcase';

const FULL_SPEED = 1 / SCROLL_SECONDS_PER_FRAME;

const STOP_TAU = 0.05;

const START_TAU = 0.1;

const VELOCITY_EPSILON = 1e-4;

const HOVER_RESUME_DELAY_MS = 1000;

const MANUAL_COOLDOWN_MS = 5000;

const MANUAL_TWEEN_MS = 720;

const CENTER_TWEEN_MS = 400;

const INDEX_HYSTERESIS = 0.55;

const VIDEO_LOAD_TIMEOUT_MS = 45000;

const AMBIENT_STAGGER_MS = 1500;

const NOTICE_TIMEOUT_MS = 8000;

const NARROW_MQ = '(max-width: 767px)';

const COARSE_MQ = '(pointer: coarse)';

const REDUCED_MQ = '(prefers-reduced-motion: reduce)';

export type ReelState =
  | 'auto'
  | 'hover'
  | 'resuming'
  | 'manual'
  | 'drag'
  | 'cooldown'
  | 'playing';

type SuspendSource = 'visibility' | 'intersection';

interface PointerDragSession {
  pointerId: number;
  startX: number;
  startOffset: number;
  cellPx: number;
  pressedAt: number;
  dragging: boolean;
}

export interface VideoSessionState {
  active: boolean;
  playing: boolean;
  muted: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
}

const VIDEO_SESSION_IDLE: VideoSessionState = {
  active: false,
  playing: false,
  muted: false,
  currentTime: 0,
  duration: 0,
  loading: false,
};

interface TweenTask {
  from: number;
  to: number;
  start: number;
  duration: number;
  onDone?: () => void;
}

interface VideoHandlers {
  onMeta: () => void;
  onPlay: () => void;
  onPause: () => void;
  onTime: () => void;
  onPlaying: () => void;
  onEnded: () => void;
  onError: () => void;
  onVolume: () => void;
}

interface VideoSlotRuntime {
  index: number;
  slot: number;
  videoEl: HTMLVideoElement;
  tex: THREE.VideoTexture;
  started: boolean;
  failed: boolean;
  watching: boolean;
  loadTimer: number;
  playTimer: number;
}

export interface UseFilmstripOptions {
  inputEnabled?: boolean;
  autoScroll?: boolean;
  pauseOnHover?: boolean;
  autoResumeDelayMs?: number;
}

export interface ReelDebugHook {
  getOffset(): number;
  getVelocity(): number;
  getState(): ReelState;
  getIndex(): number;
  getVideo(): HTMLVideoElement | null;
  getAmbientVideos(): HTMLVideoElement[];
  stepTo(targetIndex: number): void;
  nudge(dir: 1 | -1): void;
  isSuspended(): boolean;
  suspendForTest(): void;
  resumeForTest(): void;
  getFrameWidthPx(): number;
}

declare global {
  interface Window {
    __reel?: ReelDebugHook;
  }
}

function easeInOutStrong(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MQ).matches ?? false;
}

function isMobileLayout(): boolean {
  if (!window.matchMedia) return false;
  return window.matchMedia(COARSE_MQ).matches || window.matchMedia(NARROW_MQ).matches;
}

function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

function formatTime(sec: number): string {
  const v = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(v / 60);
  const s = Math.floor(v % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useFilmstrip(items: ShowcaseItem[], options: UseFilmstripOptions = {}) {
  const total = items.length;
  const inputEnabled = options.inputEnabled ?? true;
  const autoScroll = options.autoScroll ?? true;
  const pauseOnHover = options.pauseOnHover ?? true;
  const autoResumeDelayMs = options.autoResumeDelayMs ?? MANUAL_COOLDOWN_MS;
  const initialState: ReelState = autoScroll ? 'auto' : 'cooldown';

  const [state, setState] = useState<ReelState>(initialState);
  const [pressed, setPressed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [video, setVideo] = useState<VideoSessionState>(VIDEO_SESSION_IDLE);
  const [videoFailedIds, setVideoFailedIds] = useState<string[]>([]);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const reelRef = useRef<FilmStripReelHandle | null>(null);
  const interactionRef = useRef<HTMLElement | null>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const stateRef = useRef<ReelState>(initialState);
  const tweenRef = useRef<TweenTask | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isHoveredRef = useRef(false);
  const resumeAtRef = useRef(0); // resuming：恢复滚动时刻（performance.now 基）
  const cooldownUntilRef = useRef(0); // cooldown：到期时刻
  const anchorRef = useRef(0); // 索引锚点（滞回判定基准）
  const indexRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const mobileLayoutRef = useRef(false);

  const suspendedRef = useRef(false);
  const suspendSourcesRef = useRef<Set<SuspendSource>>(new Set());
  const wasWatchPlayingRef = useRef(false);

  const pointerDragRef = useRef<PointerDragSession | null>(null);
  const pressReleaseTimerRef = useRef(0);

  const slotsRef = useRef<VideoSlotRuntime[]>([]);
  const healTimerRef = useRef(0);
  const watchIndexRef = useRef<number | null>(null);
  const watchHandlersRef = useRef<VideoHandlers | null>(null);
  const failedIdsRef = useRef<Set<string>>(new Set());
  const noticeTimerRef = useRef(0);

  const suspendFnRef = useRef<((source: SuspendSource) => void) | null>(null);
  const resumeFnRef = useRef<((source: SuspendSource) => void) | null>(null);

  const setReelState = useCallback((s: ReelState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const autoScrollAllowed = useCallback(
    () => autoScroll && !reducedMotionRef.current && !mobileLayoutRef.current,
    [autoScroll]
  );

  const clearPendingTimers = useCallback(() => {
    resumeAtRef.current = 0;
    cooldownUntilRef.current = 0;
  }, []);

  const showNotice = useCallback((text: string) => {
    setVideoNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setVideoNotice(null), NOTICE_TIMEOUT_MS);
  }, []);

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
        rt.videoEl.muted = true;
      }
      if (stateRef.current === 'playing') {
        clearPendingTimers();
        if (isHoveredRef.current) {
          setReelState('hover');
        } else {
          setReelState('cooldown');
          cooldownUntilRef.current = performance.now() + autoResumeDelayMs;
        }
      }
    },
    [autoResumeDelayMs, clearPendingTimers, setReelState]
  );

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

      videoEl.addEventListener('playing', () => {
        if (rt.started) return;
        rt.started = true;
        window.clearTimeout(rt.loadTimer);
        reel.setVideoSlotVisible(slot, true);
      });

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

      const startDelay = slot * AMBIENT_STAGGER_MS;
      rt.playTimer = window.setTimeout(() => {
        rt.playTimer = 0;
        videoEl.src = item.videoUrl;
        videoEl.play().catch(() => {});
      }, startDelay);

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

  const startTween = useCallback(
    (target: number, durationMs: number, onDone?: () => void) => {
      const from = offsetRef.current;
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

  const beginWatch = useCallback(
    (index: number) => {
      const rt = slotsRef.current.find((s) => s.index === index && !s.failed);
      if (!rt) return;

      setReelState('playing');
      velocityRef.current = 0;
      tweenRef.current = null;
      clearPendingTimers();
      watchIndexRef.current = index;
      rt.watching = true;

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
        if (name === 'NotAllowedError') {
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        }
      });
    },
    [clearPendingTimers, endWatchSession, items, setReelState]
  );

  const manualStepTo = useCallback(
    (targetIndex: number) => {
      if (watchIndexRef.current != null) endWatchSession('switch');
      const cur = offsetRef.current;
      const target = targetIndex + total * Math.round((cur - targetIndex) / total);
      setReelState('manual');
      clearPendingTimers();
      startTween(target, MANUAL_TWEEN_MS, () => {
        if (stateRef.current !== 'playing') {
          setReelState('cooldown');
          cooldownUntilRef.current = performance.now() + autoResumeDelayMs;
        }
      });
    },
    [autoResumeDelayMs, clearPendingTimers, endWatchSession, setReelState, startTween, total]
  );

  const nudge = useCallback(
    (dir: 1 | -1) => {
      const base = tweenRef.current ? tweenRef.current.to : Math.round(offsetRef.current);
      manualStepTo(mod(base + dir, total));
    },
    [manualStepTo, total]
  );

  const stepTo = useCallback(
    (targetIndex: number) => {
      manualStepTo(mod(targetIndex, total));
    },
    [manualStepTo, total]
  );

  const watchVideoEl = useCallback(() => {
    const idx = watchIndexRef.current;
    if (idx == null) return null;
    return slotsRef.current.find((s) => s.index === idx)?.videoEl ?? null;
  }, []);

  const togglePlayPause = useCallback(() => {
    const v = watchVideoEl();
    if (!v) return;
    if (v.paused) {
      v.play().catch((err: unknown) => {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError') {
          v.muted = true;
          v.play().catch(() => {});
        }
      });
    } else {
      v.pause();
    }
  }, [watchVideoEl]);

  const playCurrent = useCallback(() => {
    const index = indexRef.current;
    const item = items[index];
    if (!item) return;
    if (!item.videoUrl || failedIdsRef.current.has(item.id)) {
      window.open(item.watchUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (watchIndexRef.current === index) {
      togglePlayPause();
      return;
    }
    if (watchIndexRef.current != null) endWatchSession('switch');
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

  const toggleMute = useCallback(() => {
    const v = watchVideoEl();
    if (!v) return;
    v.muted = !v.muted; // UI 状态经 volumechange 事件同步
  }, [watchVideoEl]);

  const seek = useCallback((time: number) => {
    const v = watchVideoEl();
    if (!v || !Number.isFinite(time) || time < 0) return;
    v.currentTime = Math.min(time, v.duration || time);
    setVideo((u) => ({ ...u, currentTime: v.currentTime }));
  }, [watchVideoEl]);

  const toggleFullscreen = useCallback(() => {
    const el = interactionRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const dismissNotice = useCallback(() => {
    window.clearTimeout(noticeTimerRef.current);
    setVideoNotice(null);
  }, []);

  useEffect(() => {
    if (!inputEnabled) return;
    reducedMotionRef.current = prefersReducedMotion();
    mobileLayoutRef.current = isMobileLayout();
    if ((reducedMotionRef.current || mobileLayoutRef.current) && stateRef.current === 'auto') {
      setReelState('cooldown');
      cooldownUntilRef.current = 0;
    }
  }, [inputEnabled, setReelState]);

  useEffect(() => {
    if (!inputEnabled) return;

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = Math.max(0, Math.min((now - lastTimeRef.current) / 1000, 0.1));
      lastTimeRef.current = now;

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
        const target = stateRef.current === 'auto' && autoScroll ? FULL_SPEED : 0;
        if (velocityRef.current !== target) {
          const tau = target > velocityRef.current ? START_TAU : STOP_TAU;
          velocityRef.current += (target - velocityRef.current) * (1 - Math.exp(-dt / tau));
          if (Math.abs(velocityRef.current) < VELOCITY_EPSILON) velocityRef.current = 0;
          else if (Math.abs(target - velocityRef.current) < VELOCITY_EPSILON) {
            velocityRef.current = target;
          }
          if (Math.abs(velocityRef.current) > FULL_SPEED * 50) velocityRef.current = 0;
        }
        if (velocityRef.current !== 0) offsetRef.current += velocityRef.current * dt;
      }

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
        if (isHoveredRef.current) setReelState('hover');
        else if (autoScrollAllowed()) setReelState('auto');
      }

      reelRef.current?.setOffset(offsetRef.current);

      if (Math.abs(offsetRef.current - anchorRef.current) >= INDEX_HYSTERESIS) {
        anchorRef.current = Math.round(offsetRef.current);
        const idx = mod(anchorRef.current, total);
        if (idx !== indexRef.current) {
          indexRef.current = idx;
          setCurrentIndex(idx);
          if (watchIndexRef.current != null) endWatchSession('switch');
        }
      }
    };

    const suspend = (source: SuspendSource) => {
      if (suspendedRef.current) {
        suspendSourcesRef.current.add(source);
        return;
      }
      suspendedRef.current = true;
      suspendSourcesRef.current.add(source);
      const watchRt = slotsRef.current.find((s) => s.index === watchIndexRef.current);
      wasWatchPlayingRef.current = !!watchRt && !watchRt.videoEl.paused;
      slotsRef.current.forEach((s) => s.videoEl.pause());
      pointerDragRef.current = null;
      reelRef.current?.setPressDepth(0);
      setPressed(false);
      const tw = tweenRef.current;
      if (tw) {
        offsetRef.current = tw.to;
        tweenRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
      reelRef.current?.setRenderingEnabled(false);
    };

    const resume = (source: SuspendSource) => {
      suspendSourcesRef.current.delete(source);
      if (suspendSourcesRef.current.size > 0) return; // 还有其他挂起源
      if (!suspendedRef.current) return;
      suspendedRef.current = false;
      slotsRef.current.forEach((s) => {
        if (s.index === watchIndexRef.current && !wasWatchPlayingRef.current) return;
        s.videoEl.play().catch(() => {});
      });
      const s = stateRef.current;
      if (s !== 'playing' && s !== 'cooldown' && s !== 'resuming') {
        if (isHoveredRef.current) setReelState('hover');
        else if (autoScrollAllowed()) setReelState('auto');
        else setReelState('cooldown');
      }
      velocityRef.current = 0;
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
    autoScroll,
    autoScrollAllowed,
    endWatchSession,
    inputEnabled,
    setReelState,
    total,
  ]);

  useEffect(() => {
    if (!inputEnabled || !window.matchMedia) return;
    const coarseMq = window.matchMedia(COARSE_MQ);
    const narrowMq = window.matchMedia(NARROW_MQ);
    const reducedMq = window.matchMedia(REDUCED_MQ);

    const syncMobile = () => {
      const prev = mobileLayoutRef.current;
      const next = coarseMq.matches || narrowMq.matches;
      mobileLayoutRef.current = next;
      if (next && !prev) {
        const s = stateRef.current;
        if (s === 'auto' || s === 'resuming') {
          clearPendingTimers();
          setReelState('cooldown');
          cooldownUntilRef.current = 0; // 永久静止（移动端不自动巡游）
        }
      } else if (!next && prev) {
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

  useEffect(() => {
    const main = interactionRef.current;
    if (!main || !inputEnabled) return;

    const releasePress = (pressedAt: number) => {
      window.clearTimeout(pressReleaseTimerRef.current);
      const delay = Math.max(0, 150 - (performance.now() - pressedAt));
      pressReleaseTimerRef.current = window.setTimeout(() => {
        reelRef.current?.setPressDepth(0);
        setPressed(false);
      }, delay);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.target instanceof Element && e.target.closest('button, a, input, video')) return;
      e.preventDefault();

      const pressedAt = performance.now();
      const bounds = main.getBoundingClientRect();
      const cellPx = reelRef.current?.getFrameWidthPx() || main.clientWidth * 0.82;
      pointerDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startOffset: offsetRef.current,
        cellPx: Math.max(1, cellPx),
        pressedAt,
        dragging: false,
      };
      main.setPointerCapture(e.pointerId);
      window.clearTimeout(pressReleaseTimerRef.current);
      reelRef.current?.setPressPoint(
        (e.clientX - bounds.left) / Math.max(1, bounds.width),
        1 - (e.clientY - bounds.top) / Math.max(1, bounds.height)
      );
      reelRef.current?.setPressDepth(1);
      setPressed(true);
      if (watchIndexRef.current != null) endWatchSession('switch');
      velocityRef.current = 0;
      tweenRef.current = null;
      clearPendingTimers();
      setReelState('drag');
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = pointerDragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const bounds = main.getBoundingClientRect();
      reelRef.current?.setPressPoint(
        (e.clientX - bounds.left) / Math.max(1, bounds.width),
        1 - (e.clientY - bounds.top) / Math.max(1, bounds.height)
      );
      if (!d.dragging && Math.abs(dx) < 3) return;
      d.dragging = true;
      e.preventDefault();
      offsetRef.current = d.startOffset + dx / d.cellPx;
      reelRef.current?.setOffset(offsetRef.current);
    };

    const finishPointer = (e: PointerEvent) => {
      const d = pointerDragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      pointerDragRef.current = null;
      if (main.hasPointerCapture(e.pointerId)) main.releasePointerCapture(e.pointerId);
      releasePress(d.pressedAt);

      offsetRef.current = mod(offsetRef.current, total);
      reelRef.current?.setOffset(offsetRef.current);
      anchorRef.current = Math.round(offsetRef.current);
      if (stateRef.current !== 'playing') {
        setReelState('cooldown');
        cooldownUntilRef.current = autoScroll ? performance.now() + autoResumeDelayMs : 0;
      }
    };

    main.addEventListener('pointerdown', onPointerDown);
    main.addEventListener('pointermove', onPointerMove);
    main.addEventListener('pointerup', finishPointer);
    main.addEventListener('pointercancel', finishPointer);
    return () => {
      main.removeEventListener('pointerdown', onPointerDown);
      main.removeEventListener('pointermove', onPointerMove);
      main.removeEventListener('pointerup', finishPointer);
      main.removeEventListener('pointercancel', finishPointer);
      pointerDragRef.current = null;
      window.clearTimeout(pressReleaseTimerRef.current);
      reelRef.current?.setPressDepth(0);
    };
  }, [autoResumeDelayMs, autoScroll, clearPendingTimers, endWatchSession, inputEnabled, setReelState, total]);

  useEffect(() => {
    const main = interactionRef.current;
    if (!main || !inputEnabled || !pauseOnHover) {
      isHoveredRef.current = false;
      return;
    }

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
      if (pointerDragRef.current) return;
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
  }, [clearPendingTimers, inputEnabled, pauseOnHover, setReelState]);

  useEffect(() => {
    if (!inputEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
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

  useEffect(() => {
    if (!inputEnabled) return;
    const onVisibilityChange = () => {
      if (document.hidden) suspendFnRef.current?.('visibility');
      else resumeFnRef.current?.('visibility');
    };
    if (document.hidden) suspendFnRef.current?.('visibility');
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [inputEnabled]);

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

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimerRef.current);
      window.clearInterval(healTimerRef.current);
      healTimerRef.current = 0;
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
      pointerDragRef.current = null;
      window.clearTimeout(pressReleaseTimerRef.current);
    };
  }, []);

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
    reelRef: reelRef as RefObject<FilmStripReelHandle>,
    interactionRef: interactionRef as RefObject<HTMLElement>,
    state,
    pressed,
    currentIndex,
    video,
    videoFailedIds,
    videoNotice,
    isFullscreen,
    nudge,
    stepTo,
    playCurrent,
    startAmbient,
    togglePlayPause,
    toggleMute,
    seek,
    toggleFullscreen,
    dismissNotice,
    formatTime,
  };
}
