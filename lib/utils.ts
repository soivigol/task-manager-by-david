/**
 * Format minutes into a human-readable string like "1h 30m".
 * Returns "—" for 0 or falsy values.
 */
export function fmt(minutes: number | null | undefined): string {
  if (!minutes && minutes !== 0) return "\u2014";
  if (minutes === 0) return "\u2014";
  const neg = minutes < 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const r = abs % 60;
  let s = "";
  if (h > 0) s += h + "h";
  if (r > 0) s += (s ? " " : "") + r + "m";
  return neg ? "-" + s : s;
}

/**
 * Format a date string into a display label.
 * Returns "Today", "Tomorrow", or dd/mm/yy format.
 */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return "\u2014";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(d + "T00:00:00");
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * Merge class names, filtering out falsy values.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
