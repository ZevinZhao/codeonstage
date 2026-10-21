// ============================================================
// 扭蛋机组件 - 随机抽取 Skill
// ============================================================
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Dices, RefreshCw, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { skills } from '@/data';
import type { Skill } from '@/types';
import {
  PRIMARY_CATEGORY_LABELS,
  VIBE_SUBCATEGORY_LABELS,
  VISUAL_STYLE_LABELS,
  flattenSkillTags,
  getTagBadgeColor,
} from '@/utils/constants';

type GachaState = 'idle' | 'shaking' | 'dropping' | 'cracking' | 'result';

// 扭蛋颜色组合
const CAPSULE_COLORS = [
  { top: '#8B5CF6', bottom: '#C4B5FD' }, // 紫
  { top: '#EC4899', bottom: '#F9A8D4' }, // 粉
  { top: '#06B6D4', bottom: '#67E8F9' }, // 青
  { top: '#F59E0B', bottom: '#FCD34D' }, // 橙
  { top: '#10B981', bottom: '#6EE7B7' }, // 绿
  { top: '#3B82F6', bottom: '#93C5FD' }, // 蓝
];

export function GashaponMachine() {
  const [state, setState] = useState<GachaState>('idle');
  const [result, setResult] = useState<Skill | null>(null);
  const [colorIdx, setColorIdx] = useState(0);

  const handleDraw = useCallback(() => {
    if (state === 'shaking' || state === 'dropping' || state === 'cracking') return;

    // 随机选一个 skill
    const randomSkill = skills[Math.floor(Math.random() * skills.length)];
    const randomColor = Math.floor(Math.random() * CAPSULE_COLORS.length);
    setResult(randomSkill);
    setColorIdx(randomColor);

    // 动画序列：摇晃 → 掉落 → 破开 → 结果
    setState('shaking');
    setTimeout(() => setState('dropping'), 900);
    setTimeout(() => setState('cracking'), 1600);
    setTimeout(() => setState('result'), 2200);
  }, [state]);


  const capsule = CAPSULE_COLORS[colorIdx];
  const isAnimating = state === 'shaking' || state === 'dropping' || state === 'cracking';

  return (
    <div className="flex flex-col items-center">
      {/* ========== 扭蛋机本体 ========== */}
      <div className="relative" style={{ width: 280, height: 380 }}>
        {/* 顶部圆罩 */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 top-0 ${state === 'shaking' ? 'gacha-shake' : ''}`}
          style={{
            width: 240,
            height: 240,
            borderRadius: '50% 50% 12px 12px',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.05) 100%)',
            border: '2px solid rgba(255,255,255,0.12)',
            borderBottom: 'none',
            overflow: 'hidden',
            boxShadow:
              'inset 0 0 30px rgba(139,92,246,0.15), 0 0 40px rgba(139,92,246,0.1)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* 玻璃高光 */}
          <div
            className="absolute top-4 left-8 opacity-30"
            style={{
              width: 80,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4), transparent)',
              filter: 'blur(8px)',
            }}
          />

          {/* 内部小球（装饰） */}
          {[
            { c: '#8B5CF6', s: 22, x: 40, y: 50 },
            { c: '#EC4899', s: 18, x: 170, y: 40 },
            { c: '#06B6D4', s: 20, x: 60, y: 140 },
            { c: '#F59E0B', s: 16, x: 180, y: 130 },
            { c: '#10B981', s: 24, x: 100, y: 170 },
            { c: '#3B82F6', s: 18, x: 150, y: 180 },
            { c: '#8B5CF6', s: 14, x: 30, y: 100 },
            { c: '#EC4899', s: 16, x: 200, y: 90 },
          ].map((ball, i) => (
            <div
              key={i}
              className={`absolute rounded-full ${state === 'shaking' ? 'gacha-ball-roll' : ''}`}
              style={{
                width: ball.s,
                height: ball.s,
                background: `radial-gradient(circle at 30% 30%, ${ball.c}, ${ball.c}88)`,
                left: ball.x,
                top: ball.y,
                animationDelay: `${i * 0.08}s`,
                boxShadow: `0 2px 8px ${ball.c}44`,
              }}
            />
          ))}

          {/* 顶部标识 */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-content-muted tracking-wider">
            SKILL
          </div>
        </div>

        {/* 中部连接 + 出口 */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 230,
            width: 200,
            height: 50,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTop: 'none',
            borderRadius: '0 0 16px 16px',
          }}
        >
          {/* 出口洞 */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-2"
            style={{
              width: 70,
              height: 12,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
            }}
          />
        </div>

        {/* 底座 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0"
          style={{
            width: 260,
            height: 90,
            background: 'linear-gradient(180deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))',
            border: '2px solid rgba(139,92,246,0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(139,92,246,0.15)',
          }}
        >
          {/* 按钮 */}
          <button
            onClick={handleDraw}
            disabled={isAnimating}
            className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
              w-16 h-16 rounded-full font-bold text-sm
              transition-[transform,opacity] duration-[160ms] ease-out-strong
              ${
                isAnimating
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-[0.97] cursor-pointer'
              }
              gacha-btn-glow
            `}
            style={{
              background: isAnimating
                ? 'linear-gradient(135deg, #4C1D95, #6D28D9)'
                : 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              boxShadow: isAnimating
                ? 'none'
                : '0 4px 20px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            {isAnimating ? (
              <RefreshCw className="w-5 h-5 mx-auto animate-spin" />
            ) : (
              <Dices className="w-6 h-6 mx-auto" />
            )}
          </button>

          {/* 按钮标签 */}
          {!isAnimating && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-content-subtle whitespace-nowrap">
              {state === 'result' ? '再抽一次' : '按下抽取'}
            </div>
          )}
        </div>

        {/* ========== 掉落的扭蛋 ========== */}
        {(state === 'dropping' || state === 'cracking' || state === 'result') && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: state === 'dropping' ? 250 : state === 'cracking' || state === 'result' ? 310 : 250,
              transition: 'top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              zIndex: 10,
            }}
          >
            {/* 扭蛋球 */}
            <div
              className={`relative ${state === 'dropping' ? 'gacha-drop' : ''}`}
              style={{ width: 64, height: 64 }}
            >
              {state === 'cracking' || state === 'result' ? (
                /* 破开效果：左右两半 */
                <>
                  <div
                    className="absolute left-0 top-0 gacha-crack-left"
                    style={{
                      width: 32,
                      height: 64,
                      borderRadius: '32px 0 0 32px',
                      background: `linear-gradient(135deg, ${capsule.top}, ${capsule.top}88)`,
                      boxShadow: `0 4px 12px ${capsule.top}44`,
                    }}
                  />
                  <div
                    className="absolute right-0 top-0 gacha-crack-right"
                    style={{
                      width: 32,
                      height: 64,
                      borderRadius: '0 32px 32px 0',
                      background: `linear-gradient(135deg, ${capsule.bottom}, ${capsule.bottom}88)`,
                      boxShadow: `0 4px 12px ${capsule.bottom}44`,
                    }}
                  />
                  {/* 破开光效 */}
                  {state === 'cracking' && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gacha-burst">
                      <Sparkles className="w-8 h-8 text-yellow-300" />
                    </div>
                  )}
                </>
              ) : (
                /* 完整扭蛋 */
                <div
                  className="w-full h-full rounded-full relative overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${capsule.top} 50%, ${capsule.bottom} 50%)`,
                    boxShadow: `0 6px 20px ${capsule.top}55, inset 0 1px 2px rgba(255,255,255,0.3)`,
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {/* 高光 */}
                  <div
                    className="absolute top-2 left-3 opacity-40"
                    style={{
                      width: 20,
                      height: 14,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.6)',
                      filter: 'blur(4px)',
                    }}
                  />
                  {/* 分割线 */}
                  <div
                    className="absolute left-0 right-0 top-1/2"
                    style={{
                      height: 1,
                      background: 'rgba(0,0,0,0.15)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== 粒子效果 ========== */}
        {state === 'cracking' && (
          <div className="absolute left-1/2 top-[340px] -translate-x-1/2 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute gacha-particle"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i % 2 === 0 ? capsule.top : capsule.bottom,
                  animationDelay: `${i * 0.03}s`,
                  '--angle': `${i * 30}deg`,
                  '--distance': `${40 + Math.random() * 30}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========== 结果展示 ========== */}
      {state === 'result' && result && (
        <div className="mt-6 w-full max-w-md gacha-result-appear">
          <div
            className="relative rounded-2xl p-5 border overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.05))',
              borderColor: 'rgba(139,92,246,0.2)',
              boxShadow: '0 8px 32px rgba(139,92,246,0.12)',
            }}
          >
            {/* 顶部标签 */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
                <Zap className="w-3 h-3" />
                <span>恭喜抽中</span>
              </div>
              <span className="text-xs text-content-subtle">
                {PRIMARY_CATEGORY_LABELS[result.primaryCategory]}
                {result.vibeSubcategory && ` · ${VIBE_SUBCATEGORY_LABELS[result.vibeSubcategory]}`}
                {result.tags.visualStyles[0] && ` · ${VISUAL_STYLE_LABELS[result.tags.visualStyles[0]]}`}
              </span>
            </div>

            {/* Skill 名称 */}
            <h3 className="text-lg font-bold text-content mb-1 truncate">{result.name}</h3>
            <p className="text-sm text-content-muted mb-3 line-clamp-2">{result.description}</p>

            {/* 标签 */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {flattenSkillTags(result.tags).slice(0, 5).map((t) => (
                <span
                  key={`${t.dimension}-${t.value}`}
                  className={`px-2 py-0.5 rounded-md text-xs border ${getTagBadgeColor(t.dimension, t.value)}`}
                >
                  {t.label}
                </span>
              ))}
            </div>

            {/* 作者信息 */}
            <div className="text-xs text-content-subtle mb-4">
              by <span className="text-content-muted">{result.author}</span>
              {result.stars > 0 && (
                <span className="ml-2">⭐ {result.stars}</span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Link
                to={`/skill/${result.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500/15 text-brand-300 border border-brand-500/25 hover:bg-brand-500/25 transition-colors"
              >
                查看详情
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={handleDraw}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-base-elevated text-content-muted border border-border hover:border-border-strong transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                再抽一次
              </button>
            </div>

            {/* 装饰光效 */}
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${capsule.top}, transparent 70%)`,
              }}
            />
          </div>
        </div>
      )}

      {/* ========== 提示文字 ========== */}
      {state === 'idle' && (
        <p className="mt-4 text-sm text-content-subtle text-center max-w-xs">
          找不到想用的 Skill？试试扭蛋机，随机抽取一个发现新惊喜！
        </p>
      )}
      {state === 'shaking' && (
        <p className="mt-4 text-sm text-brand-400 text-center gacha-pulse">
          🔮 摇晃中...
        </p>
      )}
      {state === 'dropping' && (
        <p className="mt-4 text-sm text-pink-400 text-center gacha-pulse">
          🧩 扭蛋掉落中...
        </p>
      )}
      {state === 'cracking' && (
        <p className="mt-4 text-sm text-yellow-400 text-center gacha-pulse">
          ✨ 即将揭晓...
        </p>
      )}
    </div>
  );
}