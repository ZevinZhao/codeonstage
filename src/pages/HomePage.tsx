

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { FilmStripReel } from '@/components/filmstrip/FilmStripReel';
import { useFilmstrip } from '@/hooks/useFilmstrip';
import type { ReelErrorReason } from '@/components/filmstrip/FilmStripReel';
import { SHOWCASE_ITEMS } from '@/data/showcase';

function HomeWordmark() {
  const wordmarkText = {
    x: 280,
    y: 116,
    textAnchor: 'middle' as const,
    fontFamily: '"Arial Black", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    fontSize: 104,
    fontWeight: 900,
    letterSpacing: -5,
  };

  return (
    <svg
      viewBox="0 0 560 160"
      role="img"
      aria-labelledby="home-wordmark-title"
      className="relative h-auto w-full overflow-visible"
    >
      <title id="home-wordmark-title">码上开演</title>
      <defs>
        <linearGradient id="home-wordmark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="42%" stopColor="#f4f1e9" />
          <stop offset="100%" stopColor="#a9adb2" />
        </linearGradient>
        <filter id="home-wordmark-shadow" x="-20%" y="-35%" width="140%" height="190%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.78" />
        </filter>
      </defs>

      <g filter="url(#home-wordmark-shadow)">
        <g transform="translate(280 0) skewX(-7) translate(-280 0)">
          <text
            {...wordmarkText}
            fill="url(#home-wordmark-fill)"
            stroke="#d5d7d8"
            strokeWidth="2.5"
            paintOrder="stroke fill"
          >
            码上开演
          </text>
        </g>
      </g>
    </svg>
  );
}

export function HomePage() {
  const [useFallbackReel, setUseFallbackReel] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const reel = useFilmstrip(SHOWCASE_ITEMS, {
    inputEnabled: !useFallbackReel,
    autoScroll: true,
    pauseOnHover: false,
    autoResumeDelayMs: 1200,
  });
  const { startAmbient } = reel;

  const handleReelError = useCallback((_reason: ReelErrorReason) => {
    setUseFallbackReel(true);
  }, []);

  const handleReelReady = useCallback((phase: 'layout' | 'images') => {
    if (phase === 'layout') setLayoutReady(true);
  }, []);

  useEffect(() => {
    if (!layoutReady || useFallbackReel) return;
    startAmbient();
  }, [layoutReady, startAmbient, useFallbackReel]);

  return (
    <div className="relative h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_50%_46%,#34383d_0%,#24272b_24%,#15171a_54%,#08090a_82%,#040405_100%)] text-white">
      <main
        ref={reel.interactionRef}
        className={`absolute inset-0 touch-none select-none ${reel.pressed ? 'cursor-grabbing' : 'cursor-grab'}`}
        aria-label="可拖动的精选作品胶卷"
      >
        <div className="absolute inset-0">
          {useFallbackReel ? (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
              <img
                src={SHOWCASE_ITEMS[0]?.coverUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[8.5vh] bg-[repeating-linear-gradient(90deg,#141414_0_6vw,transparent_6vw_9vw)]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[8.5vh] bg-[repeating-linear-gradient(90deg,#141414_0_6vw,transparent_6vw_9vw)]"
              />
            </div>
          ) : (
            <FilmStripReel
              ref={reel.reelRef}
              items={SHOWCASE_ITEMS}
              onReady={handleReelReady}
              onError={handleReelError}
            />
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(255,255,255,0.055)_0%,transparent_38%,rgba(0,0,0,0.24)_100%)]" />
      </main>

      <header className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center sm:top-4">
        <Link
          to="/"
          className="group pointer-events-auto relative block w-[clamp(190px,27vw,340px)] transition-transform duration-300 hover:scale-[1.025]"
          aria-label="码上开演 首页"
        >
          <span className="absolute inset-x-[12%] top-[24%] h-[48%] rounded-full bg-white/10 blur-xl transition-opacity group-hover:opacity-80" aria-hidden="true" />
          <HomeWordmark />
        </Link>
      </header>

      <Link
        to="/skills"
        className="group absolute bottom-5 right-5 z-20 inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-black/45 px-4 text-xs font-black tracking-[0.08em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all hover:border-white/45 hover:bg-black/65 sm:bottom-7 sm:right-8"
      >
        全部 Skill
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
