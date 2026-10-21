// ============================================================
// SkillSearch - Skill 搜索栏（带防抖）
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/utils/cn';
import { getSkillTagTexts } from '@/utils/constants';
import type { SkillTags } from '@/types';

/** SkillSearch Props */
interface SkillSearchProps {
  /** 当前搜索词 */
  value: string;
  /** 搜索词变更回调（已防抖 300ms） */
  onChange: (value: string) => void;
  /** 清除搜索回调 */
  onClear?: () => void;
  /** 搜索结果计数 */
  resultCount?: number;
  /** 是否显示结果计数 */
  showCount?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 自定义类名 */
  className?: string;
}

/** SkillSearch 组件 */
export function SkillSearch({
  value,
  onChange,
  onClear,
  resultCount,
  showCount = true,
  placeholder = '搜索 Skill 名称、描述、标签、作者...',
  className,
}: SkillSearchProps) {
  // 内部输入值（即时更新输入框，防抖后通知父组件）
  const [inputValue, setInputValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 同步外部 value 到内部（如清除搜索时）
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  /** 输入变更：即时更新内部值，防抖通知父组件 */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  /** 清除搜索 */
  const handleClear = () => {
    setInputValue('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onChange('');
    onClear?.();
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <SearchInput
        value={inputValue}
        onChange={handleChange}
        onClear={handleClear}
        placeholder={placeholder}
      />
      {/* 结果计数 */}
      {showCount && inputValue && (
        <div className="flex items-center gap-1.5 text-xs text-content-subtle">
          <Search className="w-3 h-3" />
          <span>
            {resultCount !== undefined ? (
              <>
                找到 <span className="text-content font-medium">{resultCount}</span> 个结果
              </>
            ) : (
              '搜索中...'
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 搜索过滤函数：在名称、描述、作者、标签（含各维度中文标签）中匹配
 */
export function searchSkills<
  T extends { name: string; description: string; author: string; tags: SkillTags | string[] },
>(items: T[], keyword: string): T[] {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return items;
  return items.filter((item) => {
    // 标签可搜索文本：结构化标签摊平为「取值 + 中文标签」，兼容自由字符串标签
    const tagTexts = getSkillTagTexts(item.tags);
    return (
      item.name.toLowerCase().includes(trimmed) ||
      item.description.toLowerCase().includes(trimmed) ||
      item.author.toLowerCase().includes(trimmed) ||
      tagTexts.some((t) => t.toLowerCase().includes(trimmed))
    );
  });
}