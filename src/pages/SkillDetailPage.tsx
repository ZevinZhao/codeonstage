import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileCode,
  Github,
  Globe,
  Heart,
  Layers,
  Share2,
  Sparkles,
  Star,
  Tag,
  User,
} from 'lucide-react';
import { skills, getSkillById } from '@/data';
import { cn } from '@/utils/cn';
import { formatDate, formatNumber, formatRelativeTime } from '@/utils/format';
import {
  DIFFICULTY_COLORS,
  LANGUAGE_LABELS,
  PRIMARY_CATEGORY_LABELS,
  TAG_DIMENSIONS_META,
  VIBE_SUBCATEGORY_LABELS,
  VISUAL_STYLE_LABELS,
  getTagLabel,
} from '@/utils/constants';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { GallerySiteMenu } from '@/components/layout/GallerySiteMenu';
import { MediaPreview } from '@/components/skill/MediaPreview';
import { CommentSection } from '@/components/comment/CommentSection';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useCommentStore } from '@/store/useCommentStore';
import { toast } from '@/store/useToastStore';

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="overflow-hidden border border-white/[0.09] bg-[#080808]">
      <div className="flex items-center justify-between bg-white/[0.025] px-3 py-2 text-[10px] text-white/30">
        <span>{label}</span>
        <button onClick={copy} className="inline-flex items-center gap-1.5 text-white/40 transition-colors hover:text-white">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="max-h-72 overflow-auto p-3 text-[11px] leading-5 text-white/65"><code>{code}</code></pre>
    </div>
  );
}

function MetaCell({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[6px] bg-white/[0.025] p-3">
      <div className="flex items-center gap-1.5 text-[9px] text-white/28">{icon}{label}</div>
      <div className="mt-1.5 truncate text-[11px] leading-5 text-white/68">{value}</div>
    </div>
  );
}

function SectionLabel({ index, title, description }: { index: string; title: string; description?: string }) {
  return (
    <div className="sm:pr-5">
      <div className="text-[9px] font-black tracking-[0.18em] text-white/22">{index}</div>
      <h2 className="mt-1.5 text-sm font-black text-white/85">{title}</h2>
      {description && <p className="mt-1.5 text-[10px] leading-5 text-white/28">{description}</p>}
    </div>
  );
}

export function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const skill = id ? getSkillById(id) : undefined;
  const isFavorited = useFavoriteStore((state) => id ? state.isFavorited(id) : false);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const comments = useCommentStore((state) => id ? state.getCommentsBySkillId(id) : []);
  const [shared, setShared] = useState(false);

  const relatedSkills = useMemo(() => {
    if (!skill) return [];
    return skills
      .filter((item) => item.id !== skill.id && item.primaryCategory === skill.primaryCategory)
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 4);
  }, [skill]);

  if (!skill) {
    return (
      <div className="min-h-screen bg-[#050505] px-5 py-20">
        <EmptyState icon={<FileCode className="h-12 w-12" />} title="Skill 不存在" description="这个 Skill 可能已被移除或链接有误。" action={<Button onClick={() => navigate('/skills')}>返回 Skill 大全</Button>} />
      </div>
    );
  }

  const currentIndex = skills.findIndex((item) => item.id === skill.id);
  const previous = skills[(currentIndex - 1 + skills.length) % skills.length];
  const next = skills[(currentIndex + 1) % skills.length];
  const media = skill.demoMedia ?? [];
  const avgRating = comments.length ? comments.reduce((sum, item) => sum + item.rating, 0) / comments.length : 0;

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShared(true);
    window.setTimeout(() => setShared(false), 1600);
  };

  const favorite = () => {
    toggleFavorite(skill.id);
    toast.success(isFavorited ? '已取消收藏' : '已加入收藏');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 bg-[#080808]/95 px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-1.5">
          <GallerySiteMenu />
          <Link to="/skills" className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/65 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />全部 Skill
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            <span className="hidden h-7 shrink-0 items-center rounded-full border border-white/10 px-2.5 text-[10px] text-white/40 sm:inline-flex">{PRIMARY_CATEGORY_LABELS[skill.primaryCategory]}</span>
            <span className="truncate px-1 text-[11px] font-black text-white/62">{skill.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={favorite} className={cn('flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:text-white', isFavorited && 'bg-white text-black')} aria-label={isFavorited ? '取消收藏' : '收藏'}><Heart className={cn('h-3.5 w-3.5', isFavorited && 'fill-current')} /></button>
            <button onClick={share} className="hidden h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:text-white sm:flex" aria-label="复制链接">{shared ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}</button>
            <Link to={`/skills/${previous.id}`} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:text-white" aria-label="上一个 Skill"><ChevronLeft className="h-3.5 w-3.5" /></Link>
            <Link to={`/skills/${next.id}`} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:text-white" aria-label="下一个 Skill"><ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px]">
        <div className="grid items-start md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <section className="relative h-[360px] overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#292929_0%,#151515_40%,#080808_82%)] sm:h-[430px] md:h-auto md:aspect-[16/10] md:max-h-[650px]">
              <div className="absolute right-3 top-3 z-20 rounded-full border border-white/12 bg-black/50 px-2.5 py-1.5 text-[9px] text-white/40 backdrop-blur-md">{media.length ? `${media.length} 个预览` : '暂无预览'}</div>
              {media.length ? (
                <MediaPreview media={media} autoPlay showControls fit="contain" rounded={false} loadingLabel={skill.name} height="h-full" className="bg-transparent" />
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center">
                  <div><Sparkles className="mx-auto mb-4 h-7 w-7 text-white/18" /><div className="text-2xl font-black tracking-tight text-white/70">{skill.name}</div><p className="mt-2 text-[10px] text-white/25">暂未上传演示素材</p></div>
                </div>
              )}
            </section>

            <div className="px-4 sm:px-6 lg:px-8">
              <section className="grid gap-4 py-7 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-7">
                <SectionLabel index="01" title="功能概览" description="它解决什么问题" />
                <p className="whitespace-pre-line text-sm leading-7 text-white/52">{skill.longDescription}</p>
              </section>

              <section className="grid gap-4 py-7 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-7">
                <SectionLabel index="02" title="能力地图" description="适用场景与工作流" />
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {TAG_DIMENSIONS_META.map((dimension) => {
                    const values = (skill.tags[dimension.key] as string[]) ?? [];
                    if (!values.length) return null;
                    return (
                      <div key={dimension.key}>
                        <div className="mb-2 text-[9px] tracking-[0.12em] text-white/25">{dimension.label}</div>
                        <div className="flex flex-wrap gap-1.5">{values.map((value) => <span key={value} className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[10px] text-white/52">{getTagLabel(dimension.key, value)}</span>)}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {(skill.installCommand || skill.usageExample || skill.configContent) && (
                <section className="grid gap-4 py-7 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-7">
                  <SectionLabel index="03" title="安装与使用" description="复制后即可开始" />
                  <div className="grid min-w-0 gap-2 xl:grid-cols-2">
                    {skill.installCommand && <CodeBlock code={skill.installCommand} label="安装命令" />}
                    {skill.usageExample && <CodeBlock code={skill.usageExample} label="使用示例" />}
                    {skill.configContent && <div className="xl:col-span-2"><CodeBlock code={skill.configContent} label="配置内容" /></div>}
                  </div>
                </section>
              )}

              <section className="grid gap-4 py-7 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-7">
                <SectionLabel index={skill.installCommand || skill.usageExample || skill.configContent ? '04' : '03'} title="使用反馈" description={`${comments.length} 条评论${avgRating ? ` · ${avgRating.toFixed(1)} 分` : ''}`} />
                <div className="min-w-0"><CommentSection skillId={skill.id} showHeader={false} showOverview /></div>
              </section>

            </div>
          </div>

          <aside className="bg-[#080808] p-5 md:sticky md:top-10 xl:p-6">
            <div className="flex flex-wrap gap-1.5 text-[9px] text-white/42">
              <span className="rounded-full border border-white/10 px-2.5 py-1">{PRIMARY_CATEGORY_LABELS[skill.primaryCategory]}</span>
              {skill.vibeSubcategory && <span className="rounded-full border border-white/10 px-2.5 py-1">{VIBE_SUBCATEGORY_LABELS[skill.vibeSubcategory]}</span>}
              <span className={cn('rounded-full border px-2.5 py-1', DIFFICULTY_COLORS[skill.difficulty])}>{skill.difficulty}</span>
            </div>

            <h1 className="mt-4 break-words text-2xl font-black leading-[1.12] tracking-tight text-white xl:text-3xl">{skill.name}</h1>
            <p className="mt-3 text-xs leading-6 text-white/43">{skill.description}</p>

            <a href={skill.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[5px] border border-[#ffe485] bg-[#f1cb4b] text-xs font-black text-black transition-colors hover:bg-[#ffdc68]">
              <Github className="h-4 w-4" />查看源码<ArrowUpRight className="h-3.5 w-3.5" />
            </a>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <MetaCell icon={<User className="h-3 w-3" />} label="作者" value={skill.author} />
              <MetaCell icon={<Star className="h-3 w-3" />} label="Stars" value={formatNumber(skill.stars)} />
              <MetaCell icon={<Layers className="h-3 w-3" />} label="分类" value={PRIMARY_CATEGORY_LABELS[skill.primaryCategory]} />
              <MetaCell icon={<Globe className="h-3 w-3" />} label="语言" value={LANGUAGE_LABELS[skill.language]} />
              <MetaCell icon={<Tag className="h-3 w-3" />} label="视觉风格" value={skill.tags.visualStyles.length ? skill.tags.visualStyles.map((item) => VISUAL_STYLE_LABELS[item]).join('、') : '未标注'} />
              <MetaCell icon={<Clock className="h-3 w-3" />} label="最近更新" value={formatRelativeTime(skill.updatedAt)} />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[6px] bg-white/[0.02] px-3 py-2.5 text-[9px] text-white/24">
              <span>创建 {formatDate(skill.createdAt)}</span>
              <span>更新 {formatDate(skill.updatedAt)}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link to={`/skills/${previous.id}`} className="group min-w-0 rounded-[6px] bg-white/[0.025] px-3 py-3 text-left transition-colors hover:bg-white/[0.045]">
                <div className="flex items-center gap-1 text-[9px] text-white/25"><ChevronLeft className="h-3 w-3" />上一个</div>
                <div className="mt-1 truncate text-[10px] text-white/48 transition-colors group-hover:text-white">{previous.name}</div>
              </Link>
              <Link to={`/skills/${next.id}`} className="group min-w-0 rounded-[6px] bg-white/[0.025] px-3 py-3 text-right transition-colors hover:bg-white/[0.045]">
                <div className="flex items-center justify-end gap-1 text-[9px] text-white/25">下一个<ChevronRight className="h-3 w-3" /></div>
                <div className="mt-1 truncate text-[10px] text-white/48 transition-colors group-hover:text-white">{next.name}</div>
              </Link>
            </div>

            {relatedSkills.length > 0 && (
              <div className="mt-6 pt-2">
                <div className="mb-2 flex items-center justify-between">
                  <div><div className="text-[9px] font-black tracking-[0.18em] text-white/22">RELATED</div><h2 className="mt-1 text-xs font-black text-white/70">同类 Skill</h2></div>
                  <Link to="/skills" className="text-[9px] text-white/28 transition-colors hover:text-white">查看全部</Link>
                </div>
                <div className="mt-2 space-y-1">
                  {relatedSkills.map((item) => (
                    <Link key={item.id} to={`/skills/${item.id}`} className="group flex items-center gap-3 rounded-[6px] px-2 py-2.5 transition-colors hover:bg-white/[0.025]">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-[9px] font-black text-white/35 transition-colors group-hover:border-white/25 group-hover:text-white">{item.name.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0 flex-1"><div className="truncate text-[10px] text-white/56 transition-colors group-hover:text-white">{item.name}</div><div className="mt-1 text-[8px] text-white/22">{PRIMARY_CATEGORY_LABELS[item.primaryCategory]}</div></div>
                      <ArrowUpRight className="h-3 w-3 text-white/18 transition-colors group-hover:text-white/65" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
