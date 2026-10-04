const TIER_ORDER = { foundation: 0, core: 1, advanced: 2 } as const;

export function tierRank(tier: keyof typeof TIER_ORDER): number {
  return TIER_ORDER[tier];
}

/* "2026-10-04 18:22:10" -> "2026-10-04". SQLite datetime() is always UTC. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value)}%`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
