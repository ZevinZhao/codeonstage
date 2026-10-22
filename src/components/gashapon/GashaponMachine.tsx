import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Dices, RefreshCw, RotateCw, Sparkles, Zap } from 'lucide-react';
import { skills } from '@/data';
import type { Skill } from '@/types';
import {
  PRIMARY_CATEGORY_LABELS,
  VIBE_SUBCATEGORY_LABELS,
  VISUAL_STYLE_LABELS,
  flattenSkillTags,
  getTagBadgeColor,
} from '@/utils/constants';

type GachaState = 'idle' | 'shaking' | 'dropping' | 'revealing' | 'result';

const CAPSULE_COLORS = [
  { top: '#ef5a45', bottom: '#ffc4b8', glow: 'rgba(239,90,69,.38)' },
  { top: '#f2c94c', bottom: '#fff0ad', glow: 'rgba(242,201,76,.34)' },
  { top: '#43a7a3', bottom: '#b7ebe5', glow: 'rgba(67,167,163,.34)' },
  { top: '#6378d6', bottom: '#c9d3ff', glow: 'rgba(99,120,214,.34)' },
  { top: '#c56bb4', bottom: '#f2c5e8', glow: 'rgba(197,107,180,.34)' },
  { top: '#7fa958', bottom: '#d7edbb', glow: 'rgba(127,169,88,.34)' },
];

const CAPSULES = [
  [9, 53, 54, -18, 0], [23, 68, 58, 22, 2], [41, 60, 55, -8, 3], [59, 69, 59, 14, 1],
  [77, 57, 54, -20, 4], [13, 34, 52, 18, 5], [31, 41, 57, -24, 1], [50, 36, 54, 12, 0],
  [68, 40, 58, -9, 2], [82, 31, 50, 21, 3], [22, 17, 52, -13, 4], [42, 20, 55, 17, 5],
  [61, 17, 51, -19, 0], [74, 11, 48, 9, 1], [5, 16, 49, 24, 3],
] as const;

function Capsule({ top, bottom, className = '', style }: { top: string; bottom: string; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-full border border-black/20 ${className}`}
      style={{ background: `linear-gradient(180deg, ${top} 0 48%, #ece7db 48% 52%, ${bottom} 52% 100%)`, boxShadow: 'inset -7px -8px 12px rgba(0,0,0,.17), inset 5px 5px 8px rgba(255,255,255,.28), 0 4px 9px rgba(0,0,0,.28)', ...style }}
    >
      <span className="absolute left-[21%] top-[13%] h-[22%] w-[34%] -rotate-[18deg] rounded-full bg-white/45 blur-[1px]" />
      <span className="absolute inset-x-0 top-[48%] h-[3px] bg-black/20" />
      <span className="absolute bottom-[16%] right-[20%] h-[7%] w-[7%] rounded-full bg-black/15" />
    </div>
  );
}

export function GashaponMachine({ pool }: { pool?: Skill[] }) {
  const availableSkills = pool?.length ? pool : skills;
  const [state, setState] = useState<GachaState>('idle');
  const [result, setResult] = useState<Skill | null>(null);
  const [colorIndex, setColorIndex] = useState(1);

  useEffect(() => {
    setState('idle');
    setResult(null);
  }, [pool]);

  const draw = useCallback(() => {
    if (state === 'shaking' || state === 'dropping' || state === 'revealing') return;
    const nextResult = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    setResult(nextResult);
    setColorIndex(Math.floor(Math.random() * CAPSULE_COLORS.length));
    setState('shaking');
    window.setTimeout(() => setState('dropping'), 950);
    window.setTimeout(() => setState('revealing'), 1700);
    window.setTimeout(() => setState('result'), 2250);
  }, [availableSkills, state]);

  const capsule = CAPSULE_COLORS[colorIndex];
  const busy = state === 'shaking' || state === 'dropping' || state === 'revealing';
  const status = useMemo(() => {
    if (state === 'shaking') return ['搅拌中', '机械盘正在混合扭蛋'];
    if (state === 'dropping') return ['出货中', '扭蛋正在通过落球通道'];
    if (state === 'revealing') return ['开启中', '正在读取内部 Skill'];
    if (state === 'result') return ['抽取完成', '扭蛋已到达取物仓'];
    return ['等待投币', '转动把手，随机获得一个 Skill'];
  }, [state]);

  return (
    <div className="relative mx-auto grid w-full max-w-[1180px] items-center gap-5 lg:grid-cols-[minmax(480px,1.08fr)_minmax(320px,.72fr)] lg:gap-8">
      <section className="relative flex min-h-[680px] items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.09] bg-[#0a0a0a] px-3 py-7 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,.09),transparent_36%),linear-gradient(115deg,transparent_0_48%,rgba(255,255,255,.018)_48%_52%,transparent_52%)]" />
        <div className="pointer-events-none absolute bottom-7 h-8 w-[420px] max-w-[80%] rounded-full bg-black blur-xl" />

        <div className={`gacha-machine relative h-[620px] w-[370px] max-w-full origin-bottom ${state === 'shaking' ? 'gacha-machine-shake' : ''}`} aria-label="Skill 扭蛋机">
          <div className="absolute left-1/2 top-0 z-20 h-[58px] w-[326px] -translate-x-1/2 rounded-t-[24px] border border-black/40 bg-[linear-gradient(180deg,#f7f3e9_0%,#d5d0c5_100%)] shadow-[inset_0_2px_1px_rgba(255,255,255,.8),0_6px_18px_rgba(0,0,0,.35)]">
            <div className="absolute inset-x-3 top-2.5 flex h-[34px] items-center justify-between rounded-[7px] border border-black/20 bg-[#e94f37] px-4 text-[#fff8ea] shadow-[inset_0_2px_5px_rgba(0,0,0,.18)]">
              <span className="text-[10px] font-black tracking-[0.22em]">SKILL CAPSULE</span>
              <span className="rounded-full border border-white/35 px-2 py-0.5 text-[8px] font-black">M-01</span>
            </div>
          </div>

          <div className="absolute left-1/2 top-[48px] z-10 h-[310px] w-[318px] -translate-x-1/2 overflow-hidden rounded-[22px_22px_34px_34px] border-[6px] border-[#d9d5ca] bg-[linear-gradient(135deg,rgba(218,237,236,.28),rgba(255,255,255,.06)_45%,rgba(106,135,138,.16))] shadow-[inset_0_0_0_1px_rgba(255,255,255,.4),inset_0_-24px_40px_rgba(0,0,0,.22),0_10px_24px_rgba(0,0,0,.38)]">
            <div className="absolute inset-[5px] overflow-hidden rounded-[14px_14px_28px_28px] border border-white/20 bg-[#101b1b]/65">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)', backgroundSize: '26px 26px' }} />
              <div className="absolute inset-x-0 bottom-0 h-[50%] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.3))]" />
              <div className="absolute -left-8 top-8 h-[250px] w-[64px] rotate-[13deg] bg-white/10 blur-[2px]" />
              <div className="absolute right-8 top-3 h-[110px] w-[16px] rotate-[18deg] rounded-full bg-white/15 blur-[1px]" />

              <div className="absolute inset-[13px]">
                {CAPSULES.map(([x, y, size, rotation, tone], index) => {
                  const color = CAPSULE_COLORS[tone];
                  return (
                    <Capsule
                      key={`${x}-${y}`}
                      top={color.top}
                      bottom={color.bottom}
                      className={state === 'shaking' ? 'gacha-capsule-jostle' : ''}
                      style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, transform: `translate(-50%,-50%) rotate(${rotation}deg)`, animationDelay: `${index * 35}ms`, '--capsule-rotate': `${rotation}deg` } as CSSProperties}
                    />
                  );
                })}
              </div>

              <div className={`absolute bottom-[-52px] left-1/2 h-[138px] w-[138px] -translate-x-1/2 rounded-full border-[12px] border-[#bbb7ad] bg-[#2d302f] shadow-[inset_0_0_0_4px_#77746c,inset_0_0_22px_#000] ${state === 'shaking' ? 'gacha-mixer-turn' : ''}`}>
                {[0, 90, 180, 270].map((degree) => <span key={degree} className="absolute left-1/2 top-1/2 h-[8px] w-[48px] origin-left rounded-full bg-[#8d8a82]" style={{ transform: `rotate(${degree}deg) translateX(9px)` }} />)}
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-[338px] h-[250px] w-[344px] -translate-x-1/2 rounded-[16px_16px_26px_26px] border border-black/45 bg-[linear-gradient(105deg,#ded9cd_0%,#f4f0e6_24%,#cbc6bb_58%,#eee9df_100%)] shadow-[inset_0_2px_1px_rgba(255,255,255,.8),inset_-12px_0_20px_rgba(0,0,0,.08),0_18px_30px_rgba(0,0,0,.5)]">
            <div className="absolute inset-x-0 top-0 h-[18px] rounded-t-[15px] border-b border-black/30 bg-[#e94f37] shadow-[inset_0_2px_1px_rgba(255,255,255,.25)]" />
            <div className="absolute left-[29px] top-[49px] h-[72px] w-[66px] rounded-[8px] border border-black/30 bg-[#c8c3b8] shadow-[inset_0_3px_7px_rgba(0,0,0,.2)]">
              <div className="mx-auto mt-4 h-[27px] w-[8px] rounded-sm border border-black/50 bg-[#242524] shadow-[inset_0_0_4px_#000]" />
              <div className="mt-2 text-center text-[7px] font-black tracking-[0.12em] text-black/55">1 COIN</div>
            </div>

            <div className="absolute left-1/2 top-[32px] h-[120px] w-[120px] -translate-x-1/2 rounded-full border border-black/25 bg-[#bcb8ae] shadow-[inset_0_7px_13px_rgba(0,0,0,.22),0_2px_1px_rgba(255,255,255,.8)]">
              <div className="absolute inset-[13px] rounded-full border border-black/50 bg-[repeating-conic-gradient(#333_0deg_8deg,#171817_8deg_15deg)] shadow-[0_7px_12px_rgba(0,0,0,.38)]" />
              <button
                type="button"
                onClick={draw}
                disabled={busy}
                className={`absolute inset-[24px] flex cursor-grab items-center justify-center rounded-full border border-black/60 bg-[radial-gradient(circle_at_38%_30%,#666_0%,#252625_56%,#111_100%)] text-[#f1cb4b] shadow-[inset_0_2px_2px_rgba(255,255,255,.26),0_6px_10px_rgba(0,0,0,.42)] transition-transform active:cursor-grabbing ${busy ? 'gacha-knob-turn cursor-wait' : 'hover:scale-[1.04] active:scale-[.98]'}`}
                aria-label={state === 'result' ? '再抽一次' : '转动把手抽取 Skill'}
              >
                <RotateCw className="h-8 w-8" strokeWidth={2.4} />
              </button>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[7px] font-black tracking-[0.14em] text-black/50">TURN</span>
              <span className="absolute -right-7 top-1/2 -translate-y-1/2 text-[8px] font-black text-black/45">→</span>
            </div>

            <div className="absolute right-[29px] top-[50px] w-[63px] text-center text-black/50">
              <div className="text-[7px] font-black tracking-[0.1em]">CAPSULE</div>
              <div className="mx-auto mt-2 h-[42px] w-[42px] rounded-full border border-black/25 bg-[#bcb8ae] p-2 shadow-[inset_0_3px_6px_rgba(0,0,0,.18)]">
                <Dices className="h-full w-full" strokeWidth={1.5} />
              </div>
            </div>

            <div className="absolute bottom-[20px] left-1/2 h-[66px] w-[172px] -translate-x-1/2 rounded-[8px_8px_24px_24px] border border-black/55 bg-[#242625] p-[7px] shadow-[inset_0_8px_12px_rgba(0,0,0,.7),0_2px_1px_rgba(255,255,255,.6)]">
              <div className={`relative h-full overflow-hidden rounded-[4px_4px_18px_18px] border border-white/10 bg-[#090a09] ${state === 'dropping' ? 'gacha-tray-hit' : ''}`}>
                <div className="absolute inset-x-3 top-2 h-px bg-white/10" />
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-black tracking-[0.16em] text-white/25">PUSH / TAKE</span>
                {(state === 'dropping' || state === 'revealing' || state === 'result') && (
                  <Capsule top={capsule.top} bottom={capsule.bottom} className={`absolute left-1/2 top-1/2 h-[46px] w-[46px] ${state === 'dropping' ? 'gacha-dispense-drop' : ''}`} style={{ transform: 'translate(-50%,-55%) rotate(-12deg)', boxShadow: `0 5px 18px ${capsule.glow}` }} />
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-[7px] left-1/2 h-[35px] w-[320px] -translate-x-1/2 rounded-[6px_6px_18px_18px] border border-black/55 bg-[linear-gradient(180deg,#cbc6ba,#8e8a82)] shadow-[0_9px_18px_rgba(0,0,0,.55)]" />

          {(state === 'dropping' || state === 'revealing') && (
            <div className="pointer-events-none absolute left-1/2 top-[322px] z-30 h-[184px] w-[60px] -translate-x-1/2 overflow-hidden">
              <Capsule top={capsule.top} bottom={capsule.bottom} className="gacha-chute-capsule absolute left-1/2 top-0 h-[46px] w-[46px]" style={{ '--capsule-glow': capsule.glow } as CSSProperties} />
            </div>
          )}
        </div>
      </section>

      <aside className="flex min-h-[560px] flex-col rounded-[10px] border border-white/[0.09] bg-[#090909] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-5 pb-4">
          <div>
            <div className="text-[10px] font-black tracking-[0.22em] text-[#f1cb4b]">RANDOM DISCOVERY</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">扭一个 Skill</h1>
          </div>
          <div className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] tabular-nums text-white/35">{availableSkills.length} 枚</div>
        </div>

        <div className="mt-1 flex items-center gap-3 rounded-[7px] bg-white/[0.025] px-3 py-3">
          <span className={`h-2 w-2 rounded-full ${busy ? 'animate-pulse bg-[#f1cb4b]' : state === 'result' ? 'bg-[#73b56a]' : 'bg-white/25'}`} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-white/75">{status[0]}</div>
            <div className="mt-1 text-[10px] text-white/30">{status[1]}</div>
          </div>
          {busy && <RefreshCw className="h-4 w-4 animate-spin text-white/35" />}
          {state === 'result' && <Check className="h-4 w-4 text-[#73b56a]" />}
        </div>

        {state === 'result' && result ? (
          <div className="gacha-result-appear flex flex-1 flex-col pt-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f1cb4b]/25 bg-[#f1cb4b]/10 px-2.5 py-1 text-[10px] font-black text-[#f1cb4b]"><Zap className="h-3 w-3" />抽取结果</span>
              <span className="text-[10px] text-white/30">{PRIMARY_CATEGORY_LABELS[result.primaryCategory]}{result.vibeSubcategory && ` · ${VIBE_SUBCATEGORY_LABELS[result.vibeSubcategory]}`}</span>
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight text-white">{result.name}</h2>
            <p className="mt-3 line-clamp-3 text-xs leading-6 text-white/45">{result.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {flattenSkillTags(result.tags).slice(0, 5).map((tag) => <span key={`${tag.dimension}-${tag.value}`} className={`rounded-full border px-2.5 py-1 text-[10px] ${getTagBadgeColor(tag.dimension, tag.value)}`}>{tag.label}</span>)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-[6px] bg-white/[0.025] p-3"><div className="text-white/25">作者</div><div className="mt-1 truncate text-white/65">{result.author}</div></div>
              <div className="rounded-[6px] bg-white/[0.025] p-3"><div className="text-white/25">视觉风格</div><div className="mt-1 truncate text-white/65">{result.tags.visualStyles[0] ? VISUAL_STYLE_LABELS[result.tags.visualStyles[0]] : '未标注'}</div></div>
            </div>
            <div className="mt-auto flex gap-2 pt-6">
              <Link to={`/skills/${result.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#f1cb4b] text-xs font-black text-black transition-colors hover:bg-[#ffe06b]">打开 Skill<ArrowRight className="h-3.5 w-3.5" /></Link>
              <button type="button" onClick={draw} className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-white/10 px-3 text-xs font-black text-white/60 transition-colors hover:text-white"><RefreshCw className="h-3.5 w-3.5" />再扭一次</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col pt-5">
            <p className="max-w-sm text-sm leading-7 text-white/45">从当前分类随机抽取一个 Skill。像真实扭蛋机一样，投入一次好奇心，然后顺时针转动把手。</p>
            <div className="mt-6 space-y-2">
              {['在顶部选择想探索的分类', '转动机器中央的机械把手', '从下方取物仓打开扭蛋'].map((text, index) => <div key={text} className="flex items-center gap-3 rounded-[7px] border border-white/[0.08] bg-white/[0.02] px-3 py-3 text-xs text-white/45"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[9px] text-white/45">{index + 1}</span>{text}</div>)}
            </div>
            <button type="button" onClick={draw} disabled={busy} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-white text-xs font-black text-black transition-colors hover:bg-white/85 disabled:cursor-wait disabled:opacity-50"><RotateCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{busy ? status[0] : '转动把手'}</button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-white/22"><Sparkles className="h-3 w-3" />每次结果完全随机，不设排名</div>
          </div>
        )}
      </aside>
    </div>
  );
}
