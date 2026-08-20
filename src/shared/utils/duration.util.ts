const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Converte durações como "60s", "15m", "24h" ou "7d" para segundos. */
export function durationToSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());

  if (!match) {
    throw new Error(
      `Invalid duration format: "${value}". Use e.g. "60s", "15m", "24h" or "7d".`,
    );
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit];
}
