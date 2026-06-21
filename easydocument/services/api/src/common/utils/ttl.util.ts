export function ttlToDate(ttl: string, now = new Date()): Date {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return new Date(now.getTime() + amount * multipliers[unit]);
}
