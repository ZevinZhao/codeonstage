// ============================================================
// 404 页面 - 未找到匹配路由时展示（放映厅语言：衬线大字 + 齿孔点缀）
// ============================================================
import { Link } from 'react-router-dom';
import { Home, Compass, Film, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** NotFoundPage 404 页面 */
export function NotFoundPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
        {/* 眉标（与内页刊头同语言） */}
        <p className="mb-6 text-[10px] uppercase tracking-[0.32em] text-content-faint">
          Lost Reel
        </p>

        {/* 大号 404：衬线展示字，安静克制 */}
        <div className="inline-flex items-center justify-center mb-6">
          <h1 className="font-display text-7xl md:text-9xl leading-none tracking-[0.06em] text-content">
            404
          </h1>
        </div>

        {/* 胶片齿孔点缀 */}
        <div className="film-divider mx-auto mb-8 max-w-xs" aria-hidden="true" />

        {/* 图标徽章（中性细边框） */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-border-subtle text-content-muted text-sm mb-6">
          <Film className="w-4 h-4" strokeWidth={1.75} />
          <span>这一卷胶片走丢了</span>
        </div>

        {/* 标题 */}
        <h2 className="text-2xl md:text-3xl font-semibold text-content mb-3">
          找不到这个页面
        </h2>

        {/* 描述 */}
        <p className="text-content-muted max-w-md mx-auto mb-10 leading-relaxed">
          你访问的链接可能已失效、被删除，或从未存在过。
          不如回到首页继续探索 AI 编程 Skill 的世界。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button size="lg" icon={<Home className="w-4 h-4" />}>
              返回首页
            </Button>
          </Link>
          <Link to="/skills">
            <Button variant="outline" size="lg" icon={<Compass className="w-4 h-4" />}>
              浏览 Skill 大全
            </Button>
          </Link>
        </div>

        {/* 装饰性提示 */}
        <div className="mt-16 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.02] border border-border-subtle text-sm text-content-subtle">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>或者使用浏览器返回上一页</span>
        </div>
      </div>
    </div>
  );
}