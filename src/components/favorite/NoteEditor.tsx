import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Pencil, Check, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Textarea } from '@/components/ui/Textarea';

interface NoteEditorProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  maxLength?: number;
}

function renderMarkdown(text: string): string {
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
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
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

    if (line.trim() === '') {
      htmlParts.push('<div class="h-2"></div>');
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, '');
      htmlParts.push(
        `<div class="flex gap-1.5 my-0.5"><span class="text-content-subtle">•</span><span>${renderInline(
          content
        )}</span></div>`
      );
      continue;
    }

    htmlParts.push(`<p class="my-0.5">${renderInline(line)}</p>`);
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(
      `<pre class="my-1.5 p-2.5 rounded-md bg-base border border-border overflow-x-auto text-xs font-mono text-content-muted">${escapeHtml(
        codeBuffer.join('\n')
      )}</pre>`
    );
  }

  return htmlParts.join('');
}

function renderInline(text: string): string {
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-base border border-border text-xs font-mono text-content-muted">$1</code>'
  );
  result = result.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="text-content font-semibold">$1</strong>'
  );
  return result;
}

export function NoteEditor({
  value,
  onSave,
  className,
  maxLength = 2000,
}: NoteEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const triggerSave = (next: string) => {
    setSaveState('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(next);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    }, 1000);
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setDraft(next);
    triggerSave(next);
  };

  const handleToggleEdit = () => {
    if (editing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSave(draft);
      setSaveState('idle');
    }
    setEditing((v) => !v);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isEmpty = !value.trim();

  return (
    <div className={cn('w-full', className)}>
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
