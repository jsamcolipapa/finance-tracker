/** Dates are stored as local calendar days (YYYY-MM-DD), never as UTC timestamps. */

export function todayIso(now = new Date()): string {
  return toIsoDay(now);
}

export function toIsoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Today", "Yesterday", or "Oct 12" (with the year if it's not this year). */
export function relativeDay(iso: string, now = new Date()): string {
  const today = toIsoDay(now);
  if (iso === today) return 'Today';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (iso === toIsoDay(yesterday)) return 'Yesterday';
  const date = parseIsoDay(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function longDay(iso: string): string {
  return parseIsoDay(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDay(toIso).getTime() - parseIsoDay(fromIso).getTime()) / 86_400_000);
}
