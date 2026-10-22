import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

const sizeMap = {
  sm: { icon: 14, gap: 'gap-0.5', text: 'text-xs' },
  md: { icon: 18, gap: 'gap-1', text: 'text-sm' },
  lg: { icon: 24, gap: 'gap-1.5', text: 'text-base' },
} as const;

interface StarRatingProps {
  value: number;
  readOnly?: boolean;
  size?: keyof typeof sizeMap;
  onChange?: (value: number) => void;
  showValue?: boolean;
  className?: string;
}

function StarIcon({
  size,
  fillPercent,
  active,
}: {
  size: number;
  fillPercent: number;
  active: boolean;
}) {
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

  const displayValue = hoverValue ?? value;

  const stars = Array.from({ length: 5 }, (_, i) => {

    const diff = displayValue - i;
    if (diff <= 0) return 0;
    if (diff >= 1) return 1;
    return diff;
  });

  const handleEnter = (index: number) => {
    if (readOnly) return;
    setHoverValue(index);
  };

  const handleLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

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
