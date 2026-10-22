import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/utils/cn';
import { getSkillTagTexts } from '@/utils/constants';
import type { SkillTags } from '@/types';

interface SkillSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  resultCount?: number;
  showCount?: boolean;
  placeholder?: string;
  className?: string;
}

export function SkillSearch({
  value,
  onChange,
  onClear,
  resultCount,
  showCount = true,
  placeholder = '搜索 Skill 名称、描述、标签、作者...',
  className,
}: SkillSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

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

  const handleClear = () => {
    setInputValue('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onChange('');
    onClear?.();
  };

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

export function searchSkills<
  T extends { name: string; description: string; author: string; tags: SkillTags | string[] },
>(items: T[], keyword: string): T[] {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return items;
  return items.filter((item) => {
    const tagTexts = getSkillTagTexts(item.tags);
    return (
      item.name.toLowerCase().includes(trimmed) ||
      item.description.toLowerCase().includes(trimmed) ||
      item.author.toLowerCase().includes(trimmed) ||
      tagTexts.some((t) => t.toLowerCase().includes(trimmed))
    );
  });
}
