// ============================================================
// 类名合并工具
// ============================================================

/**
 * 合并类名，过滤 falsy 值
 * 简易版 clsx，无需额外依赖
 */
export function cn(...classes: (string | number | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}