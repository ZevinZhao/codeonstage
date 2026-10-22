

export function cn(...classes: (string | number | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
