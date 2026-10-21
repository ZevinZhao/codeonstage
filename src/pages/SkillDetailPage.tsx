// ============================================================
// Skill 详情页 - 完整信息展示
// ============================================================
import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Heart,
  Share2,
  Github,
  User,
  Clock,
  Calendar,
  Gauge,
  Globe,
  Tag,
  Copy,
  Check,
  Sparkles,
  Terminal,
  FileCode,
  FileText,
  MessageSquare,
  ThumbsUp,
  ExternalLink,
  ChevronRight,
  Layers,
  Film,
} from 'lucide-react';
import { skills, getSkillById } from '@/data';
import { cn } from '@/utils/cn';
import { formatNumber, formatDate, formatRelativeTime } from '@/utils/format';
import {
  PRIMARY_CATEGORY_LABELS,
  PRIMARY_CATEGORY_BADGE_COLORS,
  VIBE_SUBCATEGORY_LABELS,
  VIBE_SUBCATEGORY_BADGE_COLORS,
  VISUAL_STYLE_LABELS,
  VISUAL_STYLE_BADGE_COLORS,
  DIFFICULTY_COLORS,
  LANGUAGE_LABELS,
  TAG_DIMENSIONS_META,
  flattenSkillTags,
  getTagBadgeColor,
  getTagLabel,
} from '@/utils/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilmFrame } from '@/components/ui/FilmFrame';
import { SkillCard } from '@/components/skill/SkillCard';
import { MediaPreview } from '@/components/skill/MediaPreview';
import { CommentSection } from '@/components/comment/CommentSection';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useCommentStore } from '@/store/useCommentStore';
import { toast } from '@/store/useToastStore';

/** 代码块组件 */
function CodeBlock({
  code,
  label,
  icon,
}: {
  code: string;
  label?: string;
  icon?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 兜底：使用传统方法
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // 忽略
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-[#0d0d0d]">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-base-elevated/50">
        <div className="flex items-center gap-2 text-xs text-content-muted">
          {icon}
          {label || '代码'}
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
            copied
              ? 'text-success bg-success/10'
              : 'text-content-subtle hover:text-content hover:bg-base-elevated'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              复制
            </>
          )}
        </button>
      </div>
      {/* 代码内容 */}
      <pre className="p-4 overflow-x-auto text-sm text-content font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** 元信息项 */
function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-content-subtle">{icon}</span>
      <span className="text-sm text-content-subtle">{label}</span>
      <span className="text-sm text-content font-medium">{value}</span>
    </div>
  );
}

/** SkillDetailPage */
export function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const skill = id ? getSkillById(id) : undefined;

  const isFavorited = useFavoriteStore((s) => (id ? s.isFavorited(id) : false));
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);

  // 获取该 Skill 的评论（用于右侧栏评论概览）
  const comments = useCommentStore((s) => (id ? s.getCommentsBySkillId(id) : []));

  // 计算平均评分
  const avgRating = useMemo(() => {
    if (comments.length === 0) return 0;
    const sum = comments.reduce((acc, c) => acc + c.rating, 0);
    return sum / comments.length;
  }, [comments]);

  // 相关推荐：同大类（vibe 大类进一步按 Vibe 二级分类）的其他 Skill
  const relatedSkills = useMemo(() => {
    if (!skill) return [];
    return skills
      .filter((s) => {
        if (s.id === skill.id) return false;
        if (s.primaryCategory !== skill.primaryCategory) return false;
        // vibe 大类下若已知二级分类，优先同细分
        if (skill.primaryCategory === 'vibe' && skill.vibeSubcategory) {
          return s.vibeSubcategory === skill.vibeSubcategory;
        }
        return true;
      })
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 4);
  }, [skill]);

  // 分享功能
  const [shared, setShared] = useState(false);
  const handleShare = async () => {
    if (!skill) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: skill.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // 用户取消分享，忽略
    }
  };

  // 未找到 Skill
  if (!skill) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <EmptyState
          icon={<FileCode className="w-12 h-12" strokeWidth={1.5} />}
          title="Skill 不存在"
          description="找不到对应的 Skill，可能已被删除或链接错误"
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/skills')}>
              返回 Skill 大全
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* ============================================================ */}
      {/* 顶部：返回 + 标题 */}
      {/* ============================================================ */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-content-subtle hover:text-content transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* 标题区 */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Badge color={PRIMARY_CATEGORY_BADGE_COLORS[skill.primaryCategory]} size="md">
            {PRIMARY_CATEGORY_LABELS[skill.primaryCategory]}
          </Badge>
          {skill.vibeSubcategory && (
            <Badge color={VIBE_SUBCATEGORY_BADGE_COLORS[skill.vibeSubcategory]} size="md">
              {VIBE_SUBCATEGORY_LABELS[skill.vibeSubcategory]}
            </Badge>
          )}
          {skill.tags.visualStyles.map((vs) => (
            <Badge key={vs} color={`${VISUAL_STYLE_BADGE_COLORS[vs]} border-current/20`} size="md">
              {VISUAL_STYLE_LABELS[vs]}
            </Badge>
          ))}
          {skill.featured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/15 text-content text-xs font-medium">
              <Sparkles className="w-3 h-3" strokeWidth={1.75} />
              精选
            </span>
          )}
          <span
            className={cn(
              'px-2 py-0.5 rounded border text-xs',
              DIFFICULTY_COLORS[skill.difficulty]
            )}
          >
            {skill.difficulty}
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-[0.06em] leading-[1.15] text-content mb-3">{skill.name}</h1>
        <p className="text-lg text-content-muted max-w-3xl leading-relaxed">
          {skill.description}
        </p>
      </div>

      {/* ============================================================ */}
      {/* 效果展示：视频/图片媒体（胶片边框，作品为视觉焦点） */}
      {/* ============================================================ */}
      {skill.demoMedia && skill.demoMedia.length > 0 && (
        <section className="mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3 px-1">
            <h2 className="text-lg font-semibold text-content flex items-center gap-2">
              <Film className="w-5 h-5 text-content-subtle" strokeWidth={1.75} />
              效果展示
            </h2>
            <p className="text-sm text-content-subtle">结合效果视频了解和使用</p>
          </div>
          <FilmFrame>
            <MediaPreview
              media={skill.demoMedia}
              autoPlay
              showControls
              height="h-72 md:h-96"
              rounded={false}
            />
          </FilmFrame>
        </section>
      )}

      {/* ============================================================ */}
      {/* 主体：左侧信息 + 右侧操作栏 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：详情内容（占 2 列） */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* 完整描述 */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-content mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-content-subtle" />
              详细介绍
            </h2>
            <p className="text-content-muted leading-relaxed whitespace-pre-line">
              {skill.longDescription}
            </p>

            {/* 标签（按维度分组展示） */}
            <div className="mt-5 pt-5 border-t border-border-subtle">
              <div className="flex items-center gap-2 mb-3 text-sm text-content-subtle">
                <Tag className="w-4 h-4" />
                标签
                {skill.tagBasis && (
                  <span className="text-xs text-content-faint">依据：{skill.tagBasis}</span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {TAG_DIMENSIONS_META.map((dim) => {
                  const values = (skill.tags[dim.key] as readonly string[] | undefined) ?? [];
                  if (values.length === 0) return null;
                  return (
                    <div key={dim.key} className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-content-faint w-16 flex-shrink-0">{dim.label}</span>
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => (
                          <Badge
                            key={`${dim.key}-${value}`}
                            color={getTagBadgeColor(dim.key, value)}
                            size="md"
                          >
                            {getTagLabel(dim.key, value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {flattenSkillTags(skill.tags).length === 0 && (
                  <span className="text-sm text-content-faint">暂无标签</span>
                )}
              </div>
            </div>
          </Card>

          {/* 安装说明 */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-content-subtle" />
              安装与使用
            </h2>

            <div className="flex flex-col gap-4">
              {/* 安装命令 */}
              {skill.installCommand && (
                <div>
                  <div className="text-sm text-content-muted mb-2 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-content-subtle" />
                    安装命令
                  </div>
                  <CodeBlock
                    code={skill.installCommand}
                    label="terminal"
                    icon={<Terminal className="w-3.5 h-3.5" />}
                  />
                </div>
              )}

              {/* 使用示例 */}
              {skill.usageExample && (
                <div>
                  <div className="text-sm text-content-muted mb-2 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-content-subtle" />
                    使用示例
                  </div>
                  <CodeBlock
                    code={skill.usageExample}
                    label="example"
                    icon={<FileCode className="w-3.5 h-3.5" />}
                  />
                </div>
              )}

              {/* 配置内容 */}
              {skill.configContent && (
                <div>
                  <div className="text-sm text-content-muted mb-2 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-content-subtle" />
                    配置内容
                  </div>
                  <CodeBlock
                    code={skill.configContent}
                    label="config"
                    icon={<FileCode className="w-3.5 h-3.5" />}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* 评论区入口：评分概览 + 完整评论区（CommentSection 由另一个开发者实现） */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-content flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-content-subtle" />
                评论区
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-content-subtle">
                  {comments.length} 条评论
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-current" />
                    <span className="text-content font-medium">
                      {avgRating.toFixed(1)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* 评分概览 */}
            {comments.length > 0 ? (
              <div className="mb-4 p-4 rounded-lg bg-base-elevated border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-content-muted">社区评分</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-4 h-4',
                          i < Math.round(avgRating)
                            ? 'text-warning fill-current'
                            : 'text-content-faint'
                        )}
                      />
                    ))}
                    <span className="ml-1.5 text-sm text-content font-medium">
                      {avgRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-content-subtle">
                  基于 {comments.length} 位用户的评价
                </p>
              </div>
            ) : (
              <div className="mb-4 p-4 rounded-lg bg-base-elevated border border-border text-center">
                <p className="text-sm text-content-subtle">
                  暂无评论，快来分享你的使用体验吧！
                </p>
              </div>
            )}

            {/* 完整评论区 */}
            <div id="comment-section">
              <CommentSection skillId={skill.id} showHeader={false} showOverview={false} />
            </div>
          </Card>
        </div>

        {/* 右侧：操作 + 元信息（占 1 列） */}
        <div className="flex flex-col gap-6">
          {/* 操作栏 */}
          <Card padding="lg">
            <div className="flex flex-col gap-3">
              <Button
                fullWidth
                size="lg"
                variant={isFavorited ? 'secondary' : 'primary'}
                icon={<Heart className={cn('w-4 h-4', isFavorited && 'fill-current text-error')} />}
                onClick={() => {
                  toggleFavorite(skill.id);
                  toast.success(isFavorited ? '已取消收藏' : '已加入收藏');
                }}
              >
                {isFavorited ? '已收藏' : '收藏'}
              </Button>

              <Button
                fullWidth
                size="lg"
                variant="outline"
                icon={shared ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4" />}
                onClick={handleShare}
              >
                {shared ? '链接已复制' : '分享'}
              </Button>

              <a href={skill.sourceUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button
                  fullWidth
                  size="lg"
                  variant="secondary"
                  icon={<Github className="w-4 h-4" />}
                >
                  查看源码
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
          </Card>

          {/* 元信息 */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-content mb-4 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-content-subtle" />
              元信息
            </h3>
            <div className="flex flex-col gap-3">
              <MetaItem
                icon={<User className="w-4 h-4" />}
                label="作者"
                value={skill.author}
              />
              <MetaItem
                icon={<Layers className="w-4 h-4" />}
                label="大类"
                value={PRIMARY_CATEGORY_LABELS[skill.primaryCategory]}
              />
              {skill.vibeSubcategory && (
                <MetaItem
                  icon={<Tag className="w-4 h-4" />}
                  label="Vibe 细分"
                  value={VIBE_SUBCATEGORY_LABELS[skill.vibeSubcategory]}
                />
              )}
              {skill.tags.visualStyles.length > 0 && (
                <MetaItem
                  icon={<Tag className="w-4 h-4" />}
                  label="画风"
                  value={skill.tags.visualStyles
                    .map((vs) => VISUAL_STYLE_LABELS[vs])
                    .join('、')}
                />
              )}
              <MetaItem
                icon={<Star className="w-4 h-4 text-warning" />}
                label="Stars"
                value={formatNumber(skill.stars)}
              />
              <MetaItem
                icon={<Gauge className="w-4 h-4" />}
                label="难度"
                value={skill.difficulty}
              />
              <MetaItem
                icon={<Globe className="w-4 h-4" />}
                label="语言"
                value={LANGUAGE_LABELS[skill.language]}
              />
              <MetaItem
                icon={<Calendar className="w-4 h-4" />}
                label="创建于"
                value={formatRelativeTime(skill.createdAt)}
              />
              <MetaItem
                icon={<Clock className="w-4 h-4" />}
                label="更新于"
                value={formatRelativeTime(skill.updatedAt)}
              />
            </div>

            {/* 项目家族 */}
            {skill.family && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-content-subtle">项目家族</span>
                </div>
                <Badge color="bg-base-elevated text-content-muted border-border">
                  {skill.family}
                </Badge>
              </div>
            )}

            {/* 详细日期 */}
            <div className="mt-4 pt-4 border-t border-border-subtle text-xs text-content-faint space-y-1">
              <div>创建日期：{formatDate(skill.createdAt)}</div>
              <div>更新日期：{formatDate(skill.updatedAt)}</div>
            </div>
          </Card>

          {/* 评论概览 */}
          {comments.length > 0 && (
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-content mb-3 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-content-subtle" />
                社区反馈
              </h3>
              <div className="flex flex-col gap-2">
                {comments.slice(0, 2).map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-base-elevated border border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-content font-medium">{c.userName}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3 h-3',
                              i < c.rating ? 'text-warning fill-current' : 'text-content-faint'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-content-muted line-clamp-2">{c.content}</p>
                  </div>
                ))}
                {comments.length > 2 && (
                  <button
                    onClick={() => {
                      document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs text-content-subtle hover:text-content transition-colors text-center pt-1"
                  >
                    查看全部 {comments.length} 条评论 →
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 相关推荐 */}
      {/* ============================================================ */}
      {relatedSkills.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-content mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-content-subtle" />
            相关推荐
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedSkills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        </section>
      )}

      {/* 底部导航 */}
      <div className="mt-12 flex items-center justify-between pt-6 border-t border-border">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-content-subtle hover:text-content transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回上一页
        </button>
        <Link
          to="/skills"
          className="flex items-center gap-1.5 text-sm text-content-subtle hover:text-content transition-colors"
        >
          返回 Skill 大全
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

