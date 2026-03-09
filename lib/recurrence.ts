import type { RecurrenceType } from "@/types/app.types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface RecurrenceConfig {
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number | null;
  recurrence_days: number | null;
  recurrence_weekdays: number[] | null;
}

/**
 * Calculate the next due date based on the current due date and recurrence config.
 *
 * Recurrence types:
 * - weekly: due + (7 * interval) days
 * - monthly: due + interval months
 * - custom_days: due + recurrence_days days
 * - custom_weekdays: next selected weekday strictly after current due date
 *   (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6)
 */
export function calcNextDue(
  dateStr: string | null,
  rec: RecurrenceConfig
): string | null {
  if (!dateStr || !rec.recurrence_type) return null;

  const d = new Date(dateStr + "T00:00:00");

  switch (rec.recurrence_type) {
    case "weekly":
      d.setDate(d.getDate() + 7 * (rec.recurrence_interval ?? 1));
      break;

    case "monthly":
      d.setMonth(d.getMonth() + (rec.recurrence_interval ?? 1));
      break;

    case "custom_days":
      d.setDate(d.getDate() + (rec.recurrence_days ?? 7));
      break;

    case "custom_weekdays": {
      const weekdays = rec.recurrence_weekdays;
      if (!weekdays || weekdays.length === 0) return null;

      // JS getDay(): 0=Sun, 1=Mon ... 6=Sat
      // Our convention: 0=Mon, 1=Tue ... 6=Sun
      const jsToOur = (js: number) => (js + 6) % 7;
      const sorted = [...weekdays].sort((a, b) => a - b);
      const todayOur = jsToOur(d.getDay());

      // Find next weekday strictly after current day
      const found = sorted.find((w) => w > todayOur);
      if (found !== undefined) {
        d.setDate(d.getDate() + (found - todayOur));
      } else {
        // Wrap to next week, pick first weekday
        d.setDate(d.getDate() + (7 - todayOur + sorted[0]));
      }
      break;
    }
  }

  return d.toISOString().split("T")[0];
}

/**
 * Generate a compact human-readable label for a recurrence config.
 * Returns null if no recurrence is configured.
 */
export function recurrenceLabel(rec: RecurrenceConfig): string | null {
  if (!rec.recurrence_type) return null;

  switch (rec.recurrence_type) {
    case "weekly":
      return rec.recurrence_interval === 1
        ? "Weekly"
        : `Every ${rec.recurrence_interval ?? 1}w`;

    case "monthly":
      return rec.recurrence_interval === 1
        ? "Monthly"
        : `Every ${rec.recurrence_interval ?? 1}mo`;

    case "custom_days":
      return `Every ${rec.recurrence_days ?? 7}d`;

    case "custom_weekdays": {
      const weekdays = rec.recurrence_weekdays;
      if (!weekdays || weekdays.length === 0) return null;
      return weekdays
        .sort((a, b) => a - b)
        .map((i) => WEEKDAY_LABELS[i]?.slice(0, 2) ?? "")
        .join(", ");
    }

    default:
      return null;
  }
}
