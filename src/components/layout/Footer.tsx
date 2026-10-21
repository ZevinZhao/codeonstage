// ============================================================
// Footer 页脚
// ============================================================
import { Film, Github, Heart } from 'lucide-react';

/** Footer 组件 */
export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 border-t border-border-subtle">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 左侧：品牌 */}
          <div className="flex items-center gap-2 text-content-subtle">
            <Film className="w-4 h-4 text-content-faint" strokeWidth={1.75} />
            <span className="text-sm">码上开演 · AI 编码视频 Skill 大全</span>
          </div>

          {/* 中间：链接 */}
          <div className="flex items-center gap-6 text-sm text-content-subtle">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-content transition-colors flex items-center gap-1.5"
            >
              <Github className="w-4 h-4" strokeWidth={1.75} />
              GitHub
            </a>
            <span className="text-content-faint">·</span>
            <span>收录各种 AI 通过编码来制作视频的 Skill</span>
          </div>

          {/* 右侧：版权 */}
          <div className="flex items-center gap-1.5 text-sm text-content-subtle">
            <span>用</span>
            <Heart className="w-3.5 h-3.5 text-content-faint" strokeWidth={1.75} />
            <span>构建 · 2024-2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}