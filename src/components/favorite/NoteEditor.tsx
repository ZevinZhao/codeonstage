// ============================================================
// NoteEditor 使用心得编辑器
// - Textarea 编辑使用心得
// - 自动保存（防抖 1s）到 store
// - 字数统计
// - 编辑/查看模式切换
// - 查看模式支持 Markdown 简单渲染（加粗、列表、代码块）
// ============================================================
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Pencil, Check, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Textarea } from '@/components/ui/Textarea';


/** NoteEditor Props */
interface NoteEditorProps {
  /** 当前心得内容 */
  value: string;
  /** 保存回调（已防抖） */
  onSave: (value: string) => void;
  /** 自定义类名 */
  className?: string;
  /** 最大字数 */
  maxLength?: number;
}

/**
 * 简易 Markdown 渲染
 * 支持：**加粗**、- 列表项、`行内代码`、```代码块```
 * 注意：仅做最小渲染，避免引入完整 markdown 解析库
 */
function renderMarkdown(text: string): string {
  // 先转义 HTML 特殊字符，防止注入
  const escapeHtml = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const lines = text.split('\n');
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    // 代码块开始/结束
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        htmlParts.push(
          `<pre class="my-1.5 p-2.5 rounded-md bg-base border border-border overflow-x-auto text-xs font-mono text-content-muted">${escapeHtml(
            codeBuffer.join('\n')
          )}</pre>`
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // 空行
    if (line.trim() === '') {
      htmlParts.push('<div class="h-2"></div>');
      continue;
    }

    // 列表项
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, '');
      htmlParts.push(
        `<div class="flex gap-1.5 my-0.5"><span class="text-content-subtle">•</span><span>${renderInline(
          content
        )}</span></div>`
      );
      continue;
    }

    // 普通段落
    htmlParts.push(`<p class="my-0.5">${renderInline(line)}</p>`);
  }

  // 处理未闭合的代码块
  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(
      `<pre class="my-1.5 p-2.5 rounded-md bg-base border border-border overflow-x-auto text-xs font-mono text-content-muted">${escapeHtml(
        codeBuffer.join('\n')
      )}</pre>`
    );
  }

  return htmlParts.join('');
}

/** 渲染行内格式：加粗 + 行内代码 */
function renderInline(text: string): string {
  // 转义
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 行内代码 `xxx`
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-base border border-border text-xs font-mono text-content-muted">$1</code>'
  );
  // 加粗 **xxx**
  result = result.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="text-content font-semibold">$1</strong>'
  );
  return result;
}

/** NoteEditor 组件 */
export function NoteEditor({
  value,
  onSave,
  className,
  maxLength = 2000,
}: NoteEditorProps) {
  // 编辑模式 vs 查看模式
  const [editing, setEditing] = useState(false);
  // 本地草稿
  const [draft, setDraft] = useState(value);
  // 保存状态：idle / saving / saved
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  // 防抖定时器
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部 value 变化时同步草稿（非编辑状态）
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  /** 触发防抖保存 */
  const triggerSave = (next: string) => {
    setSaveState('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(next);
      setSaveState('saved');
      // 1.5s 后重置状态
      setTimeout(() => setSaveState('idle'), 1500);
    }, 1000);
  };

  /** 处理输入变化 */
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setDraft(next);
    triggerSave(next);
  };

  /** 切换模式 */
  const handleToggleEdit = () => {
    if (editing) {
      // 退出编辑：立即保存
      if (timerRef.current) clearTimeout(timerRef.current);
      onSave(draft);
      setSaveState('idle');
    }
    setEditing((v) => !v);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isEmpty = !value.trim();

  return (
    <div className={cn('w-full', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-content-subtle">
          <Pencil className="w-3 h-3" />
          <span>使用心得</span>
          {saveState === 'saving' && (
            <span className="text-content-faint">保存中...</span>
          )}
          {saveState === 'saved' && (
            <span className="text-success flex items-center gap-0.5">
              <Check className="w-3 h-3" /> 已保存
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleEdit}
          className="inline-flex items-center gap-1 text-xs text-content-subtle hover:text-content transition-colors"
        >
          {editing ? (
            <>
              <Eye className="w-3 h-3" />
              查看
            </>
          ) : (
            <>
              <Pencil className="w-3 h-3" />
              编辑
            </>
          )}
        </button>
      </div>

      {/* 内容区 */}
      {editing ? (
        <div>
          <Textarea
            value={draft}
            onChange={handleChange}
            placeholder="记录你的使用心得、踩坑经验、最佳实践...&#10;支持 **加粗**、`行内代码`、- 列表、```代码块```"
            rows={6}
            maxLength={maxLength}
            className="text-sm"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-content-faint">
              支持 Markdown 简单语法
            </span>
            <span className="text-xs text-content-faint tabular-nums">
              {draft.length}/{maxLength}
            </span>
          </div>
        </div>
      ) : isEmpty ? (
        <div
          className="px-3 py-2.5 rounded-lg border border-dashed border-border text-sm text-content-faint cursor-pointer hover:border-border-strong hover:text-content-subtle transition-colors"
          onClick={handleToggleEdit}
        >
          点击添加使用心得...
        </div>
      ) : (
        <div
          className="px-3 py-2.5 rounded-lg bg-base-elevated/50 border border-border text-sm text-content-muted leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}
    </div>
  );
}