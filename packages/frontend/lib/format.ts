/** How sizes and dates read, as Finder writes them, in the person's language. */

export interface SizeUnits {
  bytes: (count: number) => string;
  kilobytes: string;
  megabytes: string;
  gigabytes: string;
  terabytes: string;
}

/** A size in decimal units, one decimal under 10 of a unit, the number in the locale's own digits. */
export function formatSize(bytes: number, units: SizeUnits, locale: string): string {
  if (bytes < 1000) return units.bytes(bytes);
  const steps = [units.kilobytes, units.megabytes, units.gigabytes, units.terabytes];
  let value = bytes / 1000;
  let step = 0;
  while (value >= 1000 && step < steps.length - 1) {
    value /= 1000;
    step++;
  }
  const digits = value < 10 ? 1 : 0;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  return `${number} ${steps[step]}`;
}

export interface DayWords {
  today: (time: string) => string;
  yesterday: (time: string) => string;
}

function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A date as Finder's list writes it: "Today at 10:04", "Yesterday at…", else the date and the time. */
export function formatDate(time: number, now: number, locale: string, words: DayWords): string {
  const date = new Date(time);
  const clock = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    date,
  );
  if (isSameDay(date, new Date(now))) return words.today(clock);
  if (isSameDay(date, new Date(now - DAY_MS))) return words.yesterday(clock);
  const day = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
  return `${day}, ${clock}`;
}

/** A day as Photos names a photo by it: "12 Mar 2026". */
export function formatDay(time: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(time));
}

/** A share of a whole, as a progress reads: "45 %" or "45%", as the locale writes it. */
export function formatPercent(fraction: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    Math.min(1, Math.max(0, fraction)),
  );
}
