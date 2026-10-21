// ============================================================
// StarRating 星级评分组件
// - 支持只读模式（展示用）与交互模式（评分用）
// - 交互模式：hover 预览 + 点击选择
// - 支持半星显示（平均分如 4.5）
// - 大小可配置 sm / md / lg
// - 选中金色 #f59e0b，未选中灰色
// ============================================================
import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

/** 尺寸映射（图标像素 + 文字） */
const sizeMap = {
  sm: { icon: 14, gap: 'gap-0.5', text: 'text-xs' },
  md: { icon: 18, gap: 'gap-1', text: 'text-sm' },
  lg: { icon: 24, gap: 'gap-1.5', text: 'text-base' },
} as const;

/** StarRating Props */
interface StarRatingProps {
  /** 当前评分（1-5，支持小数如 4.5） */
  value: number;
  /** 是否只读 */
  readOnly?: boolean;
  /** 尺寸 */
  size?: keyof typeof sizeMap;
  /** 评分变化回调（交互模式） */
  onChange?: (value: number) => void;
  /** 是否显示数字评分 */
  showValue?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 渲染单颗星（支持半星填充）
 * - fillPercent: 0 ~ 1，控制填充比例
 */
function StarIcon({
  size,
  fillPercent,
  active,
}: {
  size: number;
  fillPercent: number;
  active: boolean;
}) {
  // 完全填充或完全空心：直接用 lucide Star + fill-current
  if (fillPercent >= 1) {
    return (
      <Star
        className="text-warning fill-current"
        style={{ width: size, height: size }}
        strokeWidth={1.5}
      />
    );
  }
  if (fillPercent <= 0) {
    return (
      <Star
        className={cn(active ? 'text-warning' : 'text-content-faint')}
        style={{ width: size, height: size }}
        strokeWidth={1.5}
      />
    );
  }

  // 半星：用两层叠加实现部分填充
  // 底层：灰色描边
  // 顶层：金色填充，按 fillPercent 裁剪宽度
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <Star
        className="absolute inset-0 text-content-faint"
        style={{ width: size, height: size }}
        strokeWidth={1.5}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fillPercent * 100}%` }}
      >
        <Star
          className="text-warning fill-current"
          style={{ width: size, height: size }}
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
}

/** StarRating 组件 */
export function StarRating({
  value,
  readOnly = false,
  size = 'md',
  onChange,
  showValue = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const cfg = sizeMap[size];

  // 实际显示的值：交互模式优先 hover 预览
  const displayValue = hoverValue ?? value;

  // 生成 5 颗星的填充比例
  const stars = Array.from({ length: 5 }, (_, i) => {

    const diff = displayValue - i;
    // diff <= 0：空心；0 < diff < 1：半星；>= 1：满星
    if (diff <= 0) return 0;
    if (diff >= 1) return 1;
    return diff;
  });

  /** 处理鼠标移入某颗星 */
  const handleEnter = (index: number) => {
    if (readOnly) return;
    setHoverValue(index);
  };

  /** 处理鼠标离开整个评分区 */
  const handleLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

  /** 处理点击某颗星 */
  const handleClick = (index: number) => {
    if (readOnly) return;
    onChange?.(index);
  };

  return (
    <div
      className={cn('inline-flex items-center', cfg.gap, cfg.text, className)}
      onMouseLeave={handleLeave}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`评分 ${value} 星，共 5 星`}
    >
      {stars.map((fill, i) => {
        const index = i + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => handleEnter(index)}
            onClick={() => handleClick(index)}
            className={cn(
              'inline-flex items-center justify-center p-0 m-0 bg-transparent border-0',
              !readOnly &&
                'cursor-pointer transition-transform duration-[120ms] ease-out-strong hover:scale-105 active:scale-90',
              readOnly && 'cursor-default'
            )}
            aria-label={`${index} 星`}
          >
            <StarIcon size={cfg.icon} fillPercent={fill} active={hoverValue !== null} />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-2 text-content-muted tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}